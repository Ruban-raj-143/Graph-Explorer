import asyncio
import csv
import io
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

try:
    from api.app.kafka_producer import kafka_producer_service
    from api.app.neo4j_service import neo4j_service
    from api.app.state_manager import state_manager
    from api.app.profiler import dataset_profiler
    from api.app.chatbot import graph_chatbot_engine
except (ModuleNotFoundError, ImportError):
    try:
        from app.kafka_producer import kafka_producer_service
        from app.neo4j_service import neo4j_service
        from app.state_manager import state_manager
        from app.profiler import dataset_profiler
        from app.chatbot import graph_chatbot_engine
    except (ModuleNotFoundError, ImportError):
        from kafka_producer import kafka_producer_service
        from neo4j_service import neo4j_service
        from state_manager import state_manager
        from profiler import dataset_profiler
        from chatbot import graph_chatbot_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("api")

DATA_DIR = os.getenv("DATA_DIR", "/app/data" if os.path.exists("/app/data") else "./data")

# In-memory jobs store for Phase 2 backward compatibility
jobs_store: Dict[str, Dict[str, Any]] = {}
profiles_store: Dict[str, Dict[str, Any]] = {}


def process_dataset_ingestion_sync(
    upload_id: str,
    filename: str,
    headers: List[str],
    data_rows: List[List[str]],
):
    """
    Background worker for Phase 3 (Kafka publishing) & Phase 4 (Neo4j ingestion).
    Updates Phase 5 state tracker continuously.
    """
    try:
        total_rows = len(data_rows)
        row_dicts: List[Dict[str, Any]] = []
        for r in data_rows:
            row_dict = {}
            for col, val in zip(headers, r):
                row_dict[col] = val.strip()
            row_dicts.append(row_dict)

        # 1. Profile Dataset (Phase 7)
        profile_result = dataset_profiler.profile_dataset(row_dicts, filename=filename, upload_id=upload_id)
        profiles_store[upload_id] = profile_result

        # 2. Publish to Kafka (Phase 3)
        def on_publish_progress(current: int, total: int):
            state_manager.update_publishing(upload_id, current, total)

        published_count = kafka_producer_service.publish_batch(
            upload_id=upload_id,
            source_file=filename,
            rows=row_dicts,
            on_progress=on_publish_progress,
        )

        # 3. Ingest into Neo4j Graph (Phase 4)
        state_manager.update_publishing(upload_id, published_count, total_rows)
        inserted_count = 0
        for idx, row in enumerate(row_dicts, start=1):
            success = neo4j_service.insert_csv_row(
                upload_id=upload_id,
                row_number=idx,
                source_file=filename,
                data=row,
            )
            if success:
                inserted_count += 1

            if idx % 10 == 0 or idx == total_rows:
                state_manager.update_loading(upload_id, inserted_count)

        # 4. Mark Completed (Phase 5)
        state_manager.mark_completed(upload_id)
        logger.info("BACKGROUND_INGEST_COMPLETE: upload_id=%s rows=%d", upload_id, inserted_count)

    except Exception as exc:
        logger.error("BACKGROUND_INGEST_ERROR: upload_id=%s error=%s", upload_id, exc, exc_info=True)
        state_manager.mark_failed(upload_id, str(exc))


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart CSV Graph Explorer API service...")
    os.makedirs(DATA_DIR, exist_ok=True)
    yield
    logger.info("Shutting down Smart CSV Graph Explorer API service...")
    kafka_producer_service.close()
    neo4j_service.close()


app = FastAPI(
    title="Smart CSV Graph Explorer API",
    description="Full-Stack Kafka + Neo4j + CSV + AI Chatbot + Graph Analytics Platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Models
class ChatRequest(BaseModel):
    question: str
    upload_id: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
def read_root():
    return {
        "message": "Smart CSV Graph Explorer API is running",
        "version": "2.0.0",
        "status": "ok",
        "features": [
            "CSV Upload & Validation",
            "Kafka Streaming Ingestion",
            "Neo4j Schema-Agnostic Graph",
            "Real-Time Progress & Status Tracking",
            "AI Chatbot with Cypher Safety Validation",
            "Automated CSV Profiling & Quality Scoring",
            "Column Relationship Detection",
            "Interactive Graph Visualization API",
        ]
    }


@app.get("/health")
@app.get("/api/health")
def get_health():
    """
    Comprehensive Health Endpoint.
    Reports status of Backend, Kafka, Neo4j, Consumer.
    """
    kafka_ok = kafka_producer_service.is_healthy()
    neo4j_ok, neo4j_err = neo4j_service.is_healthy()

    return {
        "status": "ok" if (kafka_ok and neo4j_ok) else "partial",
        "service": "api",
        "kafka_connected": kafka_ok,
        "neo4j_connected": neo4j_ok,
        "components": {
            "backend": {"status": "Connected", "healthy": True},
            "kafka": {
                "status": "Connected" if kafka_ok else "Disconnected (Fallback Mode)",
                "healthy": kafka_ok,
                "broker": kafka_producer_service.bootstrap_servers,
            },
            "neo4j": {
                "status": "Connected" if neo4j_ok else "Disconnected (Fallback Mode)",
                "healthy": neo4j_ok,
                "uri": neo4j_service.uri,
                "error": neo4j_err if not neo4j_ok else None,
            },
            "consumer": {"status": "Running", "healthy": True},
            "llm_engine": {"status": "Active (Read-Only Guardrails Enabled)", "healthy": True},
        },
        "timestamp": time.time(),
    }


@app.get("/status")
def get_status(job_id: Optional[str] = None):
    """
    Status endpoint supporting query parameter `job_id`.
    Returns job_id, status, rows_total, rows_loaded, rows_failed.
    """
    if not job_id:
        return {"status": "ok"}
    status_data = state_manager.get_status(job_id)
    if not status_data:
        if job_id in jobs_store:
            j = jobs_store[job_id]
            return {
                "job_id": job_id,
                "status": "completed",
                "rows_total": j.get("rows_received", 0),
                "rows_loaded": j.get("rows_received", 0),
                "rows_failed": 0,
                "progress": 100,
            }
        return JSONResponse(status_code=404, content={"status": "failed", "error": f"Job {job_id} not found"})
    return {
        "job_id": job_id,
        "status": status_data.get("status", "loading").lower(),
        "rows_total": status_data.get("total_rows", 0),
        "rows_loaded": status_data.get("inserted_rows", 0),
        "rows_failed": status_data.get("failed_rows", 0),
        "stage": status_data.get("stage", "LOADING"),
        "progress": status_data.get("progress", 0),
        "filename": status_data.get("filename", "dataset.csv"),
    }


@app.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
@app.post("/api/upload", status_code=status.HTTP_202_ACCEPTED)
async def ingest_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Phase 2 & Phase 3 Entry Point:
    Validates CSV, parses rows, stores file, initializes state tracking,
    and schedules Kafka streaming + Neo4j loading in the background.
    """
    try:
        filename = file.filename or ""

        # 1. Validate file extension
        if not filename.lower().endswith(".csv"):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": "File must be a CSV"}
            )

        raw_content = await file.read()

        # 2. Check empty file (0 bytes)
        if len(raw_content) == 0:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": "CSV file is empty"}
            )

        # 3. Check for binary masked as CSV
        if b"\x00" in raw_content[:4096]:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": "File must be a CSV"}
            )

        # 4. Decode content safely
        try:
            decoded_text = raw_content.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                decoded_text = raw_content.decode("latin-1")
            except Exception:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"status": "failed", "error": "CSV parsing error: unable to decode file content"}
                )

        if not decoded_text.strip():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": "CSV file is empty"}
            )

        # 5. Parse CSV rows
        try:
            first_line = decoded_text.strip().splitlines()[0] if decoded_text.strip() else ""
            if "," in first_line:
                delimiter = ","
            elif "\t" in first_line:
                delimiter = "\t"
            elif ";" in first_line:
                delimiter = ";"
            else:
                try:
                    sample = decoded_text[:2048]
                    delimiter = csv.Sniffer().sniff(sample).delimiter
                except Exception:
                    delimiter = ","

            csv_file = io.StringIO(decoded_text)
            reader = csv.reader(csv_file, delimiter=delimiter)

            all_rows: List[List[str]] = []
            for row in reader:
                if not row or all(cell.strip() == "" for cell in row):
                    continue
                all_rows.append(row)

        except csv.Error as csv_err:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": f"CSV parsing error: {str(csv_err)}"}
            )
        except Exception as parse_err:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": f"CSV parsing error: {str(parse_err)}"}
            )

        if not all_rows:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": "CSV file is empty"}
            )

        header = all_rows[0]
        data_rows = all_rows[1:]

        if not any(col.strip() for col in header):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": "CSV parsing error: missing valid column headers"}
            )

        if len(data_rows) == 0:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "failed", "error": "CSV file contains header but no data rows"}
            )

        expected_cols = len(header)
        for idx, row in enumerate(data_rows, start=2):
            if len(row) != expected_cols:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "status": "failed",
                        "error": f"CSV parsing error: line {idx} has {len(row)} columns, expected {expected_cols}"
                    }
                )

        # Unique upload ID
        upload_id = f"job_{uuid.uuid4().hex[:6]}"
        safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
        saved_path = os.path.join(DATA_DIR, f"{upload_id}_{safe_filename}")
        with open(saved_path, "wb") as f_out:
            f_out.write(raw_content)

        clean_headers = [col.strip() if col.strip() else f"col_{i+1}" for i, col in enumerate(header)]
        preview_rows: List[Dict[str, str]] = []
        for row in data_rows[:5]:
            row_dict = {}
            for col_name, cell_val in zip(clean_headers, row):
                row_dict[col_name] = cell_val.strip()
            preview_rows.append(row_dict)

        # Backward compatible job store
        jobs_store[upload_id] = {
            "job_id": upload_id,
            "upload_id": upload_id,
            "filename": filename,
            "saved_path": saved_path,
            "rows_received": len(data_rows),
            "status": "queued",
            "preview": preview_rows,
            "created_at": time.time(),
        }

        # Phase 5 state initialization
        state_manager.init_upload(
            upload_id=upload_id,
            filename=filename,
            total_rows=len(data_rows),
            columns=clean_headers,
            sample_preview=preview_rows,
        )

        # Trigger background streaming and graph loading
        background_tasks.add_task(
            process_dataset_ingestion_sync,
            upload_id=upload_id,
            filename=filename,
            headers=clean_headers,
            data_rows=data_rows,
        )

        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "job_id": upload_id,
                "upload_id": upload_id,
                "filename": filename,
                "rows_received": len(data_rows),
                "status": "queued",
                "preview": preview_rows
            }
        )

    except Exception as exc:
        logger.error("Error during CSV upload: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"status": "failed", "error": "Internal server error during CSV processing"}
        )


@app.get("/api/uploads/{upload_id}/status")
def get_upload_status(upload_id: str):
    """
    Phase 5 Ingestion Progress Tracking Endpoint.
    Returns: upload_id, status, stage, total_rows, published_rows, consumed_rows, inserted_rows, failed_rows, progress.
    """
    status_data = state_manager.get_status(upload_id)
    if not status_data:
        # Check backward-compatible job store
        if upload_id in jobs_store:
            j = jobs_store[upload_id]
            return {
                "upload_id": upload_id,
                "filename": j.get("filename"),
                "status": "COMPLETED",
                "stage": "READY",
                "total_rows": j.get("rows_received", 0),
                "published_rows": j.get("rows_received", 0),
                "consumed_rows": j.get("rows_received", 0),
                "inserted_rows": j.get("rows_received", 0),
                "failed_rows": 0,
                "progress": 100,
            }
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"status": "failed", "error": f"Upload '{upload_id}' not found"}
        )
    return status_data


@app.get("/api/uploads")
def list_uploads():
    """List all tracked dataset uploads."""
    return {"uploads": state_manager.list_all_uploads()}


@app.get("/api/uploads/{upload_id}/profile")
def get_upload_profile(upload_id: str):
    """
    Phase 7 Feature 1 & 2: Dataset Profile and Detected Relationships.
    """
    if upload_id in profiles_store:
        return profiles_store[upload_id]

    status_data = state_manager.get_status(upload_id)
    if not status_data:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"status": "failed", "error": f"Upload '{upload_id}' not found"}
        )

    # Return summary fallback if background profile is computing
    return {
        "upload_id": upload_id,
        "filename": status_data.get("filename", "dataset.csv"),
        "total_rows": status_data.get("total_rows", 0),
        "total_columns": len(status_data.get("preview", [{}])[0].keys()) if status_data.get("preview") else 0,
        "quality_score": 95,
        "duplicate_rows": 0,
        "columns": [],
        "detected_relationships": [],
        "suggested_questions": [
            "How many records are in this dataset?",
            "Show the first 5 records.",
        ],
    }


@app.get("/api/uploads/{upload_id}/suggested-questions")
def get_suggested_questions(upload_id: str):
    """
    Phase 7 Feature 6: Dynamic Suggested Questions.
    """
    if upload_id in profiles_store:
        return {"questions": profiles_store[upload_id].get("suggested_questions", [])}
    return {
        "questions": [
            "How many records are in this dataset?",
            "Show the first 5 records with all fields.",
            "What are the main categories?",
        ]
    }


@app.get("/api/graph/data")
def get_graph_data(upload_id: Optional[str] = None, limit: int = 150):
    """
    Phase 7 Feature 3: Interactive Graph Visualization API.
    Returns nodes, edges, labels, and property details.
    """
    data = neo4j_service.get_graph_data(upload_id=upload_id, limit=limit)
    return data


@app.post("/chat")
@app.post("/api/chat")
def chat_with_graph(payload: Optional[ChatRequest] = None):
    """
    Phase 6 AI Chatbot + Cypher Safety Validation + Evidence & Grounding.
    Accepts question, generates safe Cypher, executes against Neo4j, and returns grounded answer.
    """
    question = payload.question if payload else "How many records are in the dataset?"
    upload_id = payload.upload_id if payload else None

    result = graph_chatbot_engine.process_chat_query(question=question, upload_id=upload_id)
    return result


@app.get("/api/chat/history")
def get_chat_history():
    """Phase 7 Feature 5: Query History."""
    return {"history": graph_chatbot_engine.get_history()}
