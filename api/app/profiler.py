import math
import re
from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


class DatasetProfiler:
    """
    Automated CSV Profiler and Schema Relationship Analyzer.
    Provides:
      1. Column-by-column statistics (data types, nulls, unique count, value distributions).
      2. Foreign-key & column overlap relationship detector with confidence scoring.
      3. Dynamic smart question generator tailored to actual dataset fields.
    """

    @staticmethod
    def infer_type(values: List[str]) -> str:
        """Infer data type for a list of string values."""
        non_empty = [v.strip() for v in values if v and v.strip()]
        if not non_empty:
            return "Empty"

        # Check for Boolean
        bool_matches = sum(1 for v in non_empty if v.lower() in {"true", "false", "yes", "no", "1", "0"})
        if bool_matches / len(non_empty) > 0.9:
            return "Boolean"

        # Check for Integer
        int_matches = sum(1 for v in non_empty if re.match(r"^-?\d+$", v))
        if int_matches / len(non_empty) > 0.9:
            return "Integer"

        # Check for Float
        float_matches = sum(1 for v in non_empty if re.match(r"^-?\d+\.\d+$", v))
        if (int_matches + float_matches) / len(non_empty) > 0.9:
            return "Float"

        # Check for Date/Datetime
        date_patterns = [
            r"^\d{4}-\d{2}-\d{2}$",
            r"^\d{2}/\d{2}/\d{4}$",
            r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",
        ]
        date_matches = sum(1 for v in non_empty if any(re.match(p, v) for p in date_patterns))
        if date_matches / len(non_empty) > 0.8:
            return "Date"

        # Check for ID (alphanumeric pattern or suffix '_id' / 'id')
        id_pattern = r"^[A-Za-z0-9_-]{3,30}$"
        if all(re.match(id_pattern, v) for v in non_empty[:20]):
            unique_ratio = len(set(non_empty)) / len(non_empty)
            if unique_ratio > 0.8:
                return "ID"

        # Check for Categorical
        unique_count = len(set(non_empty))
        if unique_count <= 25 or (unique_count / len(non_empty) < 0.2):
            return "Categorical"

        return "String"

    @classmethod
    def profile_dataset(
        cls,
        rows: List[Dict[str, Any]],
        filename: str = "dataset.csv",
        upload_id: str = "upload_1",
    ) -> Dict[str, Any]:
        """
        Generate comprehensive statistics for an uploaded dataset.
        """
        if not rows:
            return {
                "upload_id": upload_id,
                "filename": filename,
                "total_rows": 0,
                "total_columns": 0,
                "columns": [],
                "quality_score": 100,
                "duplicate_rows": 0,
                "detected_relationships": [],
                "suggested_questions": [],
            }

        total_rows = len(rows)
        columns = list(rows[0].keys())
        total_columns = len(columns)

        # Check for duplicate rows
        row_tuples = [tuple(r.get(c, "") for c in columns) for r in rows]
        duplicate_rows = total_rows - len(set(row_tuples))

        column_stats = []
        total_null_cells = 0
        total_cells = total_rows * total_columns

        for col in columns:
            vals = [str(r.get(col, "")).strip() for r in rows]
            non_empty_vals = [v for v in vals if v != ""]
            missing_count = total_rows - len(non_empty_vals)
            missing_pct = round((missing_count / total_rows) * 100, 2)
            total_null_cells += missing_count

            inferred_type = cls.infer_type(non_empty_vals)
            unique_vals = set(non_empty_vals)
            unique_count = len(unique_vals)

            # Frequency distribution
            counter = Counter(non_empty_vals)
            top_values = [{"value": val, "count": count} for val, count in counter.most_common(5)]

            # Numeric statistics if applicable
            num_stats = None
            if inferred_type in ("Integer", "Float"):
                try:
                    num_vals = [float(v) for v in non_empty_vals if re.match(r"^-?\d+(\.\d+)?$", v)]
                    if num_vals:
                        num_stats = {
                            "min": min(num_vals),
                            "max": max(num_vals),
                            "avg": round(sum(num_vals) / len(num_vals), 2),
                        }
                except Exception:
                    pass

            is_id_column = (col.lower().endswith("_id") or col.lower() == "id" or inferred_type == "ID")

            column_stats.append({
                "name": col,
                "type": inferred_type,
                "missing_count": missing_count,
                "missing_percentage": missing_pct,
                "unique_count": unique_count,
                "unique_percentage": round((unique_count / total_rows) * 100, 2) if total_rows > 0 else 0,
                "is_id": is_id_column,
                "sample_values": non_empty_vals[:5],
                "top_values": top_values,
                "numeric_stats": num_stats,
            })

        # Calculate overall dataset health/quality score (0-100)
        missing_rate = (total_null_cells / total_cells) if total_cells > 0 else 0
        duplicate_rate = (duplicate_rows / total_rows) if total_rows > 0 else 0
        quality_score = max(0, int(100 - (missing_rate * 50) - (duplicate_rate * 30)))

        # Detect cross-column relationships
        relationships = cls.detect_relationships(rows, columns, column_stats)

        # Generate smart dynamic suggested questions
        suggested_questions = cls.generate_suggested_questions(columns, column_stats)

        return {
            "upload_id": upload_id,
            "filename": filename,
            "total_rows": total_rows,
            "total_columns": total_columns,
            "quality_score": quality_score,
            "duplicate_rows": duplicate_rows,
            "columns": column_stats,
            "detected_relationships": relationships,
            "suggested_questions": suggested_questions,
        }

    @classmethod
    def detect_relationships(
        cls,
        rows: List[Dict[str, Any]],
        columns: List[str],
        column_stats: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Detect potential relationships between columns using value overlap and naming heuristics.
        Separates observed facts from proposed relationships.
        """
        relationships = []
        col_map = {c["name"]: c for c in column_stats}

        for i in range(len(columns)):
            for j in range(i + 1, len(columns)):
                col1 = columns[i]
                col2 = columns[j]

                stat1 = col_map.get(col1, {})
                stat2 = col_map.get(col2, {})

                set1 = set(str(r.get(col1, "")).strip() for r in rows if str(r.get(col1, "")).strip())
                set2 = set(str(r.get(col2, "")).strip() for r in rows if str(r.get(col2, "")).strip())

                if not set1 or not set2:
                    continue

                intersection = set1.intersection(set2)
                overlap_ratio = len(intersection) / max(min(len(set1), len(set2)), 1)

                # Naming similarity
                clean1 = re.sub(r"[^a-zA-Z0-9]", "", col1.lower())
                clean2 = re.sub(r"[^a-zA-Z0-9]", "", col2.lower())
                name_related = (clean1 in clean2 or clean2 in clean1 or ("id" in clean1 and "id" in clean2))

                # Identify likely Primary Key / Foreign Key candidate
                if overlap_ratio >= 0.5 or (name_related and len(intersection) > 0):
                    confidence = round(min(0.98, (overlap_ratio * 0.7) + (0.3 if name_related else 0.0)), 2)

                    # Determine source and target direction
                    if stat1.get("unique_count", 0) >= stat2.get("unique_count", 0):
                        parent_col, child_col = col1, col2
                    else:
                        parent_col, child_col = col2, col1

                    relationships.append({
                        "source_column": parent_col,
                        "target_column": child_col,
                        "confidence": confidence,
                        "observed_overlap_count": len(intersection),
                        "observed_overlap_percentage": round(overlap_ratio * 100, 1),
                        "observed_facts": f"Observed {len(intersection)} matching distinct values ({round(overlap_ratio * 100, 1)}% value overlap).",
                        "proposed_relationship": f"Column '{parent_col}' may serve as parent key for '{child_col}' (Confidence: {int(confidence*100)}%).",
                    })

        return relationships

    @staticmethod
    def generate_suggested_questions(
        columns: List[str],
        column_stats: List[Dict[str, Any]],
    ) -> List[str]:
        """
        Dynamically generate relevant English questions grounded in the actual dataset fields.
        """
        questions = [
            "How many records are in this dataset?",
            "Show the first 5 records with all columns.",
        ]

        # Categorical questions
        categorical_cols = [c for c in column_stats if c["type"] == "Categorical" and c["name"].lower() != "id"]
        if categorical_cols:
            best_cat = categorical_cols[0]["name"]
            questions.append(f"What is the breakdown of records by {best_cat}?")
            questions.append(f"Which {best_cat} appears most frequently?")

        # Numeric questions
        numeric_cols = [c for c in column_stats if c["type"] in ("Integer", "Float") and not c["is_id"]]
        if numeric_cols:
            best_num = numeric_cols[0]["name"]
            questions.append(f"What is the average {best_num} across all rows?")
            questions.append(f"Show the top 5 records with the highest {best_num}.")

        # Date questions
        date_cols = [c for c in column_stats if c["type"] == "Date"]
        if date_cols:
            best_date = date_cols[0]["name"]
            questions.append(f"What is the date range covered in {best_date}?")

        # Filter questions
        if categorical_cols and numeric_cols:
            c_name = categorical_cols[0]["name"]
            n_name = numeric_cols[0]["name"]
            top_val = (categorical_cols[0].get("top_values") or [{}])[0].get("value")
            if top_val:
                questions.append(f"What is the total {n_name} for records where {c_name} is '{top_val}'?")

        return questions[:6]


# Singleton instance
dataset_profiler = DatasetProfiler()
