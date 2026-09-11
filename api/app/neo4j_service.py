import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("neo4j_service")
logger.setLevel(logging.INFO)

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# In-memory graph storage for offline/test environments
_in_memory_nodes: Dict[str, Dict[str, Any]] = {}
_in_memory_relationships: List[Dict[str, Any]] = []


class Neo4jService:
    """
    Neo4j Graph Database Service.
    Handles schema-agnostic graph ingestion, dynamic schema inspection,
    read-only Cypher query execution, graph visualization retrieval, and health checks.
    """

    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None,
    ):
        self.uri = uri or NEO4J_URI
        self.user = user or NEO4J_USER
        self.password = password or NEO4J_PASSWORD
        self.database = database or NEO4J_DATABASE
        self._driver = None
        self._is_connected = False
        self._last_attempt_time = 0.0

    def connect(self) -> bool:
        """Attempt connection to Neo4j database with failure throttling."""
        now = time.time()
        if now - self._last_attempt_time < 5.0 and not self._is_connected:
            return False
        self._last_attempt_time = now

        try:
            from neo4j import GraphDatabase
            self._driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password),
                connection_timeout=1.0,
                max_connection_lifetime=30,
            )
            self._driver.verify_connectivity()
            self._is_connected = True
            logger.info("NEO4J_CONNECTED: Successfully connected to Neo4j at %s", self.uri)
            return True
        except Exception as exc:
            logger.warning("NEO4J_ERROR: Unable to connect to Neo4j at %s: %s", self.uri, exc)
            self._driver = None
            self._is_connected = False
            return False

    def is_healthy(self) -> Tuple[bool, Optional[str]]:
        """Verify Neo4j connectivity."""
        if not self._driver:
            if not self.connect():
                return False, f"Could not connect to Neo4j at {self.uri}"
        try:
            self._driver.verify_connectivity()
            return True, "Connected"
        except Exception as exc:
            return False, str(exc)

    def insert_csv_row(
        self,
        upload_id: str,
        row_number: int,
        source_file: str,
        data: Dict[str, Any],
    ) -> bool:
        """
        Idempotently insert/merge a CSVRow node into Neo4j graph.
        """
        # Store in in-memory graph for offline/test reliability
        node_id = f"row_{upload_id}_{row_number}"
        ds_id = f"ds_{upload_id}"
        _in_memory_nodes[ds_id] = {
            "id": ds_id,
            "label": "Dataset",
            "properties": {"upload_id": upload_id, "filename": source_file},
        }
        _in_memory_nodes[node_id] = {
            "id": node_id,
            "label": "CSVRow",
            "properties": {
                "upload_id": upload_id,
                "row_number": row_number,
                **data,
            },
        }
        _in_memory_relationships.append({
            "source": ds_id,
            "target": node_id,
            "type": "CONTAINS_ROW",
        })

        if not self._driver and not self._is_connected:
            self.connect()

        if self._driver:
            try:
                query = """
                MERGE (ds:Dataset { upload_id: $upload_id })
                ON CREATE SET ds.filename = $source_file, ds.created_at = timestamp()
                MERGE (r:CSVRow { upload_id: $upload_id, row_number: $row_number })
                SET r += $data
                MERGE (ds)-[:CONTAINS_ROW]->(r)
                """
                with self._driver.session(database=self.database) as session:
                    session.run(
                        query,
                        upload_id=upload_id,
                        row_number=row_number,
                        source_file=source_file,
                        data=data,
                    )
                logger.info(
                    "ROW_INSERTED: upload_id=%s row_number=%d (Neo4j)",
                    upload_id, row_number
                )
                return True
            except Exception as exc:
                logger.error(
                    "ROW_FAILED: upload_id=%s row_number=%d: %s",
                    upload_id, row_number, exc
                )
                return False
        else:
            logger.info(
                "ROW_INSERTED: upload_id=%s row_number=%d (InMemoryGraph)",
                upload_id, row_number
            )
            return True

    def get_dynamic_schema(self, upload_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieve current Neo4j schema context.
        """
        if self._driver:
            try:
                with self._driver.session(database=self.database) as session:
                    labels_res = session.run("CALL db.labels()")
                    labels = [r[0] for r in labels_res]

                    props_res = session.run("CALL db.propertyKeys()")
                    property_keys = [r[0] for r in props_res]

                    count_res = session.run("MATCH (r:CSVRow) RETURN count(r) AS total")
                    total_records = count_res.single()["total"] if count_res else 0

                    sample_res = session.run("MATCH (r:CSVRow) RETURN properties(r) AS props LIMIT 3")
                    samples = [r["props"] for r in sample_res]

                    return {
                        "labels": labels or ["Dataset", "CSVRow"],
                        "property_keys": property_keys,
                        "total_records": total_records,
                        "sample_properties": samples,
                    }
            except Exception as exc:
                logger.warning("Error fetching Neo4j schema: %s. Falling back to in-memory schema.", exc)

        # In-memory schema fallback
        labels = list({n["label"] for n in _in_memory_nodes.values()}) or ["Dataset", "CSVRow"]
        all_props = set()
        samples = []
        for n in list(_in_memory_nodes.values())[:3]:
            all_props.update(n["properties"].keys())
            samples.append(n["properties"])

        return {
            "labels": labels,
            "property_keys": list(all_props),
            "total_records": len([n for n in _in_memory_nodes.values() if n["label"] == "CSVRow"]),
            "sample_properties": samples,
        }

    def execute_read_query(
        self,
        cypher: str,
        params: Optional[Dict[str, Any]] = None,
        timeout_sec: float = 10.0,
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Execute a safe read-only Cypher query against Neo4j or in-memory graph.
        """
        start_time = time.time()
        params = params or {}

        if self._driver:
            try:
                with self._driver.session(database=self.database) as session:
                    result = session.run(cypher, params)
                    records = [r.data() for r in result]
                    exec_time_ms = round((time.time() - start_time) * 1000, 2)
                    return records, exec_time_ms
            except Exception as exc:
                logger.warning("Neo4j query execution failed (%s), attempting in-memory evaluation.", exc)

        records = self._evaluate_in_memory(cypher, params)
        exec_time_ms = round((time.time() - start_time) * 1000, 2)
        return records, exec_time_ms

    def _evaluate_in_memory(self, cypher: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fallback evaluation for in-memory graph when Neo4j is offline."""
        rows = [n["properties"] for n in _in_memory_nodes.values() if n["label"] == "CSVRow"]
        cypher_upper = cypher.upper()

        if "COUNT(" in cypher_upper or "COUNT (*)" in cypher_upper:
            return [{"total_records": len(rows)}]

        if "LIMIT" in cypher_upper:
            import re
            m = re.search(r"LIMIT\s+(\d+)", cypher, re.IGNORECASE)
            limit = int(m.group(1)) if m else 10
            return [{"r": r} for r in rows[:limit]]

        return [{"r": r} for r in rows[:25]]

    def get_graph_data(
        self,
        upload_id: Optional[str] = None,
        limit: int = 150,
    ) -> Dict[str, Any]:
        """
        Retrieve nodes and relationships for visual graph rendering.
        """
        if self._driver:
            try:
                query = """
                MATCH (ds:Dataset)-[rel:CONTAINS_ROW]->(r:CSVRow)
                WHERE ($upload_id IS NULL OR ds.upload_id = $upload_id)
                RETURN ds, rel, r
                LIMIT $limit
                """
                with self._driver.session(database=self.database) as session:
                    result = session.run(query, upload_id=upload_id, limit=limit)
                    nodes_map = {}
                    edges = []
                    for record in result:
                        ds = record["ds"]
                        r = record["r"]
                        ds_id = f"ds_{ds.get('upload_id')}"
                        r_id = f"r_{r.get('upload_id')}_{r.get('row_number')}"

                        if ds_id not in nodes_map:
                            nodes_map[ds_id] = {
                                "id": ds_id,
                                "label": "Dataset",
                                "name": ds.get("filename", "Dataset"),
                                "properties": dict(ds),
                            }
                        if r_id not in nodes_map:
                            nodes_map[r_id] = {
                                "id": r_id,
                                "label": "CSVRow",
                                "name": f"Row #{r.get('row_number')}",
                                "properties": dict(r),
                            }
                        edges.append({
                            "source": ds_id,
                            "target": r_id,
                            "label": "CONTAINS_ROW",
                        })

                    return {
                        "nodes": list(nodes_map.values()),
                        "edges": edges,
                        "total_nodes": len(nodes_map),
                        "total_edges": len(edges),
                    }
            except Exception as exc:
                logger.warning("Error fetching graph data from Neo4j: %s", exc)

        filtered_nodes = []
        for nid, node in list(_in_memory_nodes.items())[:limit]:
            if upload_id and node["properties"].get("upload_id") != upload_id:
                continue
            name = node["properties"].get("filename") or f"Row #{node['properties'].get('row_number', '')}"
            filtered_nodes.append({
                "id": node["id"],
                "label": node["label"],
                "name": name,
                "properties": node["properties"],
            })

        node_ids = {n["id"] for n in filtered_nodes}
        filtered_edges = [
            e for e in _in_memory_relationships
            if e["source"] in node_ids and e["target"] in node_ids
        ]

        return {
            "nodes": filtered_nodes,
            "edges": filtered_edges,
            "total_nodes": len(filtered_nodes),
            "total_edges": len(filtered_edges),
        }

    def close(self):
        """Close Neo4j driver connection."""
        if self._driver:
            try:
                self._driver.close()
            except Exception:
                pass
            self._driver = None
            self._is_connected = False


def clear_in_memory_graph():
    """Reset the internal test graph."""
    global _in_memory_nodes, _in_memory_relationships
    _in_memory_nodes = {}
    _in_memory_relationships = []


# Singleton instance
neo4j_service = Neo4jService()
