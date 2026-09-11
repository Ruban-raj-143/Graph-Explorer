import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    from api.app.neo4j_service import neo4j_service
except (ModuleNotFoundError, ImportError):
    try:
        from app.neo4j_service import neo4j_service
    except (ModuleNotFoundError, ImportError):
        from neo4j_service import neo4j_service

logger = logging.getLogger("chatbot")
logger.setLevel(logging.INFO)

# In-memory query history
_query_history: List[Dict[str, Any]] = []

# List of dangerous write/mutating Cypher operations to strictly block
FORBIDDEN_CYPHER_KEYWORDS = [
    r"\bCREATE\b",
    r"\bMERGE\b",
    r"\bDELETE\b",
    r"\bDETACH\b",
    r"\bSET\b",
    r"\bREMOVE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bLOAD\s+CSV\b",
    r"\bCALL\s+dbms\b",
    r"\bCALL\s+apoc\.periodic\b",
    r"\bCALL\s+apoc\.export\b",
    r"\bCALL\s+apoc\.import\b",
]


class CypherSafetyValidator:
    """
    Strict Cypher Safety Validator.
    Blocks all write, mutate, delete, and destructive operations to enforce read-only execution.
    """

    @classmethod
    def validate_cypher(cls, cypher: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that Cypher query is strictly read-only.
        Returns (is_valid, error_message).
        """
        if not cypher or not cypher.strip():
            return False, "Query cannot be empty."

        clean_cypher = cypher.strip()

        # Remove string literals to avoid false positives inside quotes
        sanitized = re.sub(r"'[^']*'", "", clean_cypher)
        sanitized = re.sub(r'"[^"]*"', "", sanitized)

        for pattern in FORBIDDEN_CYPHER_KEYWORDS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                matched = re.search(pattern, sanitized, re.IGNORECASE).group(0)
                return False, f"Dangerous operation '{matched}' detected. The Chatbot is strictly read-only."

        # Ensure query contains read keywords
        if not re.search(r"\b(MATCH|RETURN|WITH|UNWIND|SHOW|EXPLAIN)\b", sanitized, re.IGNORECASE):
            return False, "Query must start with a valid read operation such as MATCH or RETURN."

        return True, None


class GraphChatbotEngine:
    """
    AI Chatbot Engine for Graph Exploration.
    Translates natural language questions into safe, grounded Cypher queries,
    executes them against the Neo4j graph, and generates evidence-backed natural answers.
    """

    def __init__(self):
        self.safety_validator = CypherSafetyValidator()

    def generate_cypher(
        self,
        question: str,
        schema: Dict[str, Any],
        upload_id: Optional[str] = None,
    ) -> str:
        """
        Generate Cypher query from natural language question and current graph schema.
        Uses intelligent semantic matching across detected property keys.
        """
        q_lower = question.lower().strip()
        prop_keys = [k for k in schema.get("property_keys", []) if k not in ("upload_id", "row_number")]

        # Match specific upload_id if provided
        upload_filter = f"WHERE r.upload_id = '{upload_id}'" if upload_id else ""

        # Pattern 1: Count total rows / records / datasets
        if any(w in q_lower for w in ["how many records", "how many rows", "total records", "total rows", "count"]):
            if upload_filter:
                return f"MATCH (r:CSVRow) {upload_filter} RETURN count(r) AS total_records"
            return "MATCH (r:CSVRow) RETURN count(r) AS total_records"

        # Pattern 2: Breakdown / count by category
        for prop in prop_keys:
            if f"by {prop.lower()}" in q_lower or f"per {prop.lower()}" in q_lower or f"distribution of {prop.lower()}" in q_lower:
                where_clause = f"{upload_filter} AND" if upload_filter else "WHERE"
                return (
                    f"MATCH (r:CSVRow) {where_clause} r.{prop} IS NOT NULL "
                    f"RETURN r.{prop} AS {prop}, count(r) AS count "
                    f"ORDER BY count DESC LIMIT 10"
                )

        # Pattern 3: Average / Mean of numeric column
        for prop in prop_keys:
            if any(w in q_lower for w in ["average", "avg", "mean"]) and prop.lower() in q_lower:
                where_clause = f"{upload_filter} AND" if upload_filter else "WHERE"
                return f"MATCH (r:CSVRow) {where_clause} r.{prop} IS NOT NULL RETURN avg(toFloat(r.{prop})) AS average_{prop}"

        # Pattern 4: Top / highest numeric records
        for prop in prop_keys:
            if any(w in q_lower for w in ["top", "highest", "maximum", "max", "largest"]) and prop.lower() in q_lower:
                m = re.search(r"\b(\d+)\b", q_lower)
                limit = int(m.group(1)) if m else 5
                where_clause = f"{upload_filter} AND" if upload_filter else "WHERE"
                return (
                    f"MATCH (r:CSVRow) {where_clause} r.{prop} IS NOT NULL "
                    f"RETURN properties(r) AS row "
                    f"ORDER BY toFloat(r.{prop}) DESC LIMIT {limit}"
                )

        # Pattern 5: Distinct values of a column
        for prop in prop_keys:
            if any(w in q_lower for w in ["unique", "distinct", "list all", "values of"]) and prop.lower() in q_lower:
                where_clause = f"{upload_filter} AND" if upload_filter else "WHERE"
                return (
                    f"MATCH (r:CSVRow) {where_clause} r.{prop} IS NOT NULL "
                    f"RETURN DISTINCT r.{prop} AS {prop} LIMIT 25"
                )

        # Pattern 6: Specific value search
        for prop in prop_keys:
            if prop.lower() in q_lower:
                # Extract quoted or candidate values
                val_match = re.search(r"['\"]([^'\"]+)['\"]", question)
                if val_match:
                    val = val_match.group(1)
                    where_clause = f"{upload_filter} AND" if upload_filter else "WHERE"
                    return f"MATCH (r:CSVRow) {where_clause} toLower(toString(r.{prop})) = toLower('{val}') RETURN properties(r) AS row LIMIT 10"

        # Pattern 7: Show / list sample rows
        m = re.search(r"\b(\d+)\b", q_lower)
        limit = int(m.group(1)) if m else 5
        if upload_filter:
            return f"MATCH (r:CSVRow) {upload_filter} RETURN properties(r) AS row LIMIT {limit}"
        return f"MATCH (r:CSVRow) RETURN properties(r) AS row LIMIT {limit}"

    def format_grounded_answer(
        self,
        question: str,
        cypher: str,
        records: List[Dict[str, Any]],
        execution_time_ms: float,
    ) -> str:
        """
        Generate natural language answer strictly grounded in Neo4j result records.
        """
        if not records:
            return "No matching data was found in the uploaded dataset."

        first = records[0]

        # Case 1: Aggregate Count
        if "total_records" in first:
            count_val = first["total_records"]
            return f"The dataset currently contains **{count_val:,}** records in the graph."

        # Case 2: Aggregate Average
        avg_key = next((k for k in first.keys() if k.startswith("average_")), None)
        if avg_key:
            col = avg_key.replace("average_", "")
            val = first[avg_key]
            formatted_val = f"{val:,.2f}" if isinstance(val, (int, float)) else str(val)
            return f"The average value for **{col}** across the dataset is **{formatted_val}**."

        # Case 3: Group by / Breakdown
        if "count" in first and len(first) == 2:
            group_key = next(k for k in first.keys() if k != "count")
            summary_lines = [f"- **{r.get(group_key)}**: {r.get('count'):,} records" for r in records[:5]]
            return f"Here is the breakdown by **{group_key}**:\n" + "\n".join(summary_lines)

        # Case 4: Row lists
        if "row" in first:
            return f"Found **{len(records)}** matching record(s). See the evidence panel below for full property details."

        return f"Query returned **{len(records)}** record(s) from Neo4j."

    def process_chat_query(
        self,
        question: str,
        upload_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        End-to-end chat processing pipeline:
        User Question → Schema Context → Cypher Generation → Safety Validation → Neo4j Execution → Grounded Answer.
        """
        start_ts = time.time()
        q_clean = question.strip()

        if not q_clean:
            return {
                "question": question,
                "answer": "Please ask a question about your uploaded dataset.",
                "cypher": None,
                "evidence": None,
                "is_grounded": False,
                "execution_time_ms": 0,
                "error": "Empty question",
            }

        # Step 1: Retrieve Dynamic Graph Schema
        schema = neo4j_service.get_dynamic_schema(upload_id=upload_id)

        # Step 2: Generate Cypher Query
        try:
            generated_cypher = self.generate_cypher(q_clean, schema, upload_id=upload_id)
        except Exception as exc:
            logger.error("Cypher generation error: %s", exc)
            return {
                "question": question,
                "answer": "I couldn't generate a valid graph query for that question.",
                "cypher": None,
                "evidence": None,
                "is_grounded": False,
                "execution_time_ms": 0,
                "error": str(exc),
            }

        # Step 3: Safety Validation
        is_safe, safety_err = self.safety_validator.validate_cypher(generated_cypher)
        if not is_safe:
            return {
                "question": question,
                "answer": f"Safety Violation: {safety_err}",
                "cypher": generated_cypher,
                "evidence": None,
                "is_grounded": False,
                "execution_time_ms": 0,
                "error": safety_err,
            }

        # Step 4: Execute Validated Query
        records, exec_time = neo4j_service.execute_read_query(generated_cypher)

        # Step 5: Grounded Answer Generation
        answer = self.format_grounded_answer(q_clean, generated_cypher, records, exec_time)

        # Step 6: Package Evidence
        response_payload = {
            "question": question,
            "answer": answer,
            "cypher": generated_cypher,
            "result": records[:10],
            "raw_results": records[:10],
            "grounded": True,
            "is_grounded": True,
            "grounding_source": "Neo4j Graph Database",
            "execution_time_ms": exec_time,
            "records_count": len(records),
            "timestamp": time.time(),
            "error": None,
        }

        # Store in Query History
        _query_history.append(response_payload)

        return response_payload

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve recent query history."""
        return list(reversed(_query_history[-limit:]))


# Singleton instance
graph_chatbot_engine = GraphChatbotEngine()
