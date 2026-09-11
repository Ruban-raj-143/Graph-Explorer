import logging
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger("state_manager")

# Standard Status Values
STATUS_PENDING = "PENDING"
STATUS_VALIDATING = "VALIDATING"
STATUS_PUBLISHING = "PUBLISHING"
STATUS_CONSUMING = "CONSUMING"
STATUS_LOADING = "LOADING"
STATUS_COMPLETED = "COMPLETED"
STATUS_FAILED = "FAILED"
STATUS_PARTIAL = "PARTIAL"


class UploadStateManager:
    """
    Thread-safe in-memory state tracker for CSV upload lifecycles and real-time ingestion metrics.
    """

    def __init__(self):
        self._states: Dict[str, Dict[str, Any]] = {}

    def init_upload(
        self,
        upload_id: str,
        filename: str,
        total_rows: int,
        columns: List[str],
        sample_preview: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Initialize an upload lifecycle record."""
        now = time.time()
        state = {
            "upload_id": upload_id,
            "filename": filename,
            "columns": columns,
            "total_rows": total_rows,
            "validated_rows": total_rows,
            "published_rows": 0,
            "consumed_rows": 0,
            "inserted_rows": 0,
            "failed_rows": 0,
            "status": STATUS_VALIDATING,
            "percentage": 10,
            "current_stage": "VALIDATION",
            "started_at": now,
            "completed_at": None,
            "error_message": None,
            "preview": sample_preview or [],
        }
        self._states[upload_id] = state
        logger.info("STATE_INIT: upload_id=%s file=%s rows=%d", upload_id, filename, total_rows)
        return dict(state)

    def update_publishing(self, upload_id: str, published_rows: int, total_rows: Optional[int] = None):
        """Update Kafka publishing stage progress."""
        if upload_id not in self._states:
            return
        state = self._states[upload_id]
        state["published_rows"] = published_rows
        state["status"] = STATUS_PUBLISHING
        state["current_stage"] = "KAFKA_PUBLISHING"

        total = total_rows or state["total_rows"] or 1
        pct = 10 + int((published_rows / total) * 40)
        state["percentage"] = min(pct, 50)

    def update_loading(self, upload_id: str, inserted_rows: int, failed_rows: int = 0):
        """Update Neo4j graph loading stage progress."""
        if upload_id not in self._states:
            return
        state = self._states[upload_id]
        state["consumed_rows"] = inserted_rows + failed_rows
        state["inserted_rows"] = inserted_rows
        state["failed_rows"] = failed_rows
        state["status"] = STATUS_LOADING
        state["current_stage"] = "NEO4J_LOADING"

        total = state["total_rows"] or 1
        pct = 50 + int((inserted_rows / total) * 50)
        state["percentage"] = min(pct, 99)

    def mark_completed(self, upload_id: str):
        """Mark ingestion as successfully completed."""
        if upload_id not in self._states:
            return
        state = self._states[upload_id]
        state["status"] = STATUS_COMPLETED
        state["current_stage"] = "READY"
        state["percentage"] = 100
        state["completed_at"] = time.time()
        logger.info("STATE_COMPLETED: upload_id=%s rows=%d", upload_id, state["inserted_rows"])

    def mark_failed(self, upload_id: str, error_message: str):
        """Mark ingestion as failed."""
        if upload_id not in self._states:
            return
        state = self._states[upload_id]
        state["status"] = STATUS_FAILED
        state["current_stage"] = "FAILED"
        state["error_message"] = error_message
        state["completed_at"] = time.time()
        logger.error("STATE_FAILED: upload_id=%s error=%s", upload_id, error_message)

    def get_status(self, upload_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve real-time status and metrics for an upload."""
        if upload_id not in self._states:
            return None
        state = dict(self._states[upload_id])
        # Format metrics according to Phase 5 specification
        return {
            "upload_id": state["upload_id"],
            "filename": state["filename"],
            "status": state["status"],
            "stage": state["current_stage"],
            "total_rows": state["total_rows"],
            "validated_rows": state["validated_rows"],
            "published_rows": state["published_rows"],
            "consumed_rows": state["consumed_rows"],
            "inserted_rows": state["inserted_rows"],
            "failed_rows": state["failed_rows"],
            "progress": state["percentage"],
            "started_at": state["started_at"],
            "completed_at": state["completed_at"],
            "error_message": state["error_message"],
            "preview": state.get("preview", []),
        }

    def list_all_uploads(self) -> List[Dict[str, Any]]:
        """List all tracked uploads, newest first."""
        records = [dict(v) for v in self._states.values()]
        records.sort(key=lambda x: x.get("started_at", 0), reverse=True)
        return records


# Singleton instance
state_manager = UploadStateManager()
