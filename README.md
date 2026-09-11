# Smart CSV Graph Explorer

**Kafka + Neo4j + CSV + AI Chatbot + Graph Analytics Platform**

An end-to-end, production-ready full-stack application for streaming CSV data ingestion, schema-agnostic graph transformations in Neo4j, real-time lifecycle tracking, automated data profiling, cross-column relationship detection, interactive visual graph exploration, and an AI-powered Chatbot with strict Cypher safety guardrails.

---

## 🏗 System Architecture

```
                                    +-----------------------------------------+
                                    |        Interactive Browser SPA          |
                                    | (Dashboard / Profiler / Explorer / Chat)|
                                    +--------------------+--------------------+
                                                         | REST API
                                                         v
                                    +-----------------------------------------+
                                    |             FastAPI Backend             |
                                    |    /api/upload | /api/chat | /api/health|
                                    +---------+--------------------+----------+
                                              |                    |
                                 1. Validate  |                    | 4. Cypher Query
                                    & Publish |                    |    (Safety Filter)
                                              v                    v
                                    +---------+----------+  +------+----------+
                                    |    Apache Kafka    |  |  Neo4j Database |
                                    | (topic: csv-rows)  |  |  (Bolt / Cypher)|
                                    +---------+----------+  +------+----------+
                                              |                    ^
                                   2. Consume |                    | 3. Ingest
                                     Messages v                    |    Nodes
                                    +---------+--------------------+----------+
                                    |            Loader Service               |
                                    |        (Kafka Consumer -> Neo4j)        |
                                    +-----------------------------------------+
```

---

## 🚀 Key Features

1. **Schema-Agnostic CSV Ingestion & Validation**:
   - Accepts any CSV structure with dynamic headers, row validation, encoding resolution (`UTF-8`, `Latin-1`), and 5-row preview.
2. **Kafka Streaming Pipeline**:
   - Publishes validated rows as JSON messages to `csv-rows` with structured event logging (`UPLOAD_STARTED`, `ROW_PUBLISHED`, `UPLOAD_COMPLETED`).
3. **Idempotent Neo4j Graph Loader**:
   - Ingests rows into `Dataset` and `CSVRow` nodes with `CONTAINS_ROW` relationships using `MERGE` clauses.
4. **Real-Time Progress & Health Monitoring**:
   - Multi-stage status tracker: `PENDING` → `VALIDATING` → `PUBLISHING` → `CONSUMING` → `LOADING` → `COMPLETED`.
   - Comprehensive health diagnostic endpoint (`/api/health`) for Backend, Kafka, Neo4j, and Consumer.
5. **AI Chatbot with Strict Cypher Safety Guardrails**:
   - Translates English questions into Cypher queries grounded in live Neo4j schema.
   - **Read-Only Enforcement**: Blocks all mutating clauses (`CREATE`, `MERGE`, `DELETE`, `DETACH`, `SET`, `REMOVE`, `DROP`, `ALTER`, `CALL dbms.*`).
   - Grounded natural language answers with evidence provenance (Cypher query, execution latency in ms, record count, and raw data table).
6. **Automated CSV Profiling & Quality Scoring**:
   - Computes data types (Integer, Float, Date, ID, Categorical, String), missing percentages, unique counts, duplicate rows, and 0–100 quality score.
7. **Column Relationship Detection**:
   - Detects candidate foreign keys and column value overlaps with confidence scores, separating observed overlap facts from proposed relationships.
8. **Interactive Graph Explorer**:
   - SVG visual canvas with node search, label filtering, radial layout, and property inspector drawer.
9. **Query History & Dynamic Question Suggestions**:
   - Searchable query history with latency and dynamic suggested questions generated from dataset fields.

---

## 🛠 Technology Stack

- **Backend**: Python 3.11 / FastAPI / Uvicorn / Pydantic
- **Message Broker**: Apache Kafka 3.7.0 (KRaft mode, single broker)
- **Graph Database**: Neo4j 5.24 Community
- **Frontend**: Responsive Single-Page Application (Vanilla HTML5 / CSS3 / JavaScript)
- **Testing**: Pytest & FastAPI TestClient

---

## 📦 Running Locally

### Option 1: Native Python Run (Zero Docker Required)

1. **Start Backend API:**
   ```bash
   python3 -m uvicorn api.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * API: `http://localhost:8000`
   * Swagger Documentation: `http://localhost:8000/docs`
   * Health Check: `http://localhost:8000/api/health`

2. **Start Frontend Dashboard:**
   ```bash
   python3 -m http.server 3000 --directory ui
   ```
   * Open: **`http://localhost:3000`** in your browser.

---

### Option 2: Docker Compose (All 5 Services)

```bash
docker compose up --build
```
* **Frontend**: `http://localhost:3000`
* **FastAPI**: `http://localhost:8000`
* **Neo4j Browser**: `http://localhost:7474`
* **Kafka Broker**: `localhost:9092`

---

## 🧪 Running Automated Tests

Run the full 15-test validation suite covering Phases 1 through 8:
```bash
python3 -m pytest -v
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status of Backend, Kafka, Neo4j, Consumer |
| `POST` | `/api/upload` | Upload & validate CSV, start background ingestion |
| `GET` | `/api/uploads/{upload_id}/status` | Live multi-stage ingestion progress |
| `GET` | `/api/uploads/{upload_id}/profile` | CSV Profiler & detected column relationships |
| `GET` | `/api/uploads/{upload_id}/suggested-questions` | Dynamic suggested questions |
| `GET` | `/api/graph/data` | Graph nodes & relationships for visualization |
| `POST` | `/api/chat` | AI Chatbot query processing with Cypher safety check |
| `GET` | `/api/chat/history` | Query history with execution times and evidence |
