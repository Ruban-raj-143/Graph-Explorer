import io
import os
import time
import pytest
from fastapi.testclient import TestClient

from api.app.main import app
from api.app.kafka_producer import kafka_producer_service, get_in_memory_messages
from api.app.neo4j_service import neo4j_service, clear_in_memory_graph
from api.app.state_manager import state_manager
from api.app.profiler import dataset_profiler
from api.app.chatbot import graph_chatbot_engine, CypherSafetyValidator

client = TestClient(app)


class TestPhases3To8:

    def setup_method(self):
        clear_in_memory_graph()

    # 1. Clean CSV Upload & Streaming Ingestion
    def test_clean_csv_upload_and_ingestion(self):
        csv_content = (
            "customer_id,name,age,country,annual_spend\n"
            "CUST-001,Alice Smith,29,USA,1250.50\n"
            "CUST-002,Bob Jones,42,UK,3400.00\n"
            "CUST-003,Charlie Brown,35,Canada,890.20\n"
        ).encode("utf-8")

        response = client.post(
            "/api/upload",
            files={"file": ("customers.csv", csv_content, "text/csv")}
        )

        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "queued"
        assert data["rows_received"] == 3
        assert len(data["preview"]) == 3
        upload_id = data["upload_id"]

        # Allow background worker to complete
        time.sleep(0.3)

        # Verify state tracker (Phase 5)
        status_res = client.get(f"/api/uploads/{upload_id}/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["total_rows"] == 3
        assert status_data["status"] == "COMPLETED"
        assert status_data["progress"] == 100

        # Verify messages reached Kafka/Queue (Phase 3)
        msgs = get_in_memory_messages(upload_id)
        assert len(msgs) >= 3
        assert msgs[0]["data"]["customer_id"] == "CUST-001"

    # 2. Large CSV Metrics Measurement
    def test_large_csv_performance(self):
        header = "order_id,customer_id,product_category,price,quantity\n"
        rows = [f"ORD-{i},CUST-{(i%50)+1},Electronics,{(i*1.5):.2f},{(i%5)+1}\n" for i in range(1, 201)]
        csv_bytes = (header + "".join(rows)).encode("utf-8")

        start_time = time.time()
        response = client.post(
            "/api/upload",
            files={"file": ("orders_large.csv", csv_bytes, "text/csv")}
        )
        upload_time_ms = (time.time() - start_time) * 1000

        assert response.status_code == 202
        assert response.json()["rows_received"] == 200
        assert upload_time_ms < 500  # Rapid async acceptance

    # 3. Broken CSV & Error Recovery
    def test_broken_csv_validation(self):
        # Empty file
        res_empty = client.post("/api/upload", files={"file": ("empty.csv", b"", "text/csv")})
        assert res_empty.status_code == 400
        assert "empty" in res_empty.json()["error"].lower()

        # Non-CSV
        res_txt = client.post("/api/upload", files={"file": ("notes.txt", b"hello world", "text/plain")})
        assert res_txt.status_code == 400

        # Malformed column count
        malformed = "col1,col2\nval1\nval1,val2,val3\n".encode("utf-8")
        res_malformed = client.post("/api/upload", files={"file": ("bad.csv", malformed, "text/csv")})
        assert res_malformed.status_code == 400
        assert "parsing error" in res_malformed.json()["error"].lower()

    # 4. Duplicate Upload Idempotency
    def test_duplicate_upload_idempotency(self):
        csv_bytes = "id,value\n1,Alpha\n2,Beta\n".encode("utf-8")
        res1 = client.post("/api/upload", files={"file": ("data.csv", csv_bytes, "text/csv")})
        res2 = client.post("/api/upload", files={"file": ("data.csv", csv_bytes, "text/csv")})
        assert res1.status_code == 202
        assert res2.status_code == 202
        assert res1.json()["upload_id"] != res2.json()["upload_id"]

    # 5. Profiling & Relationship Detection Accuracy (Phase 7)
    def test_profiler_and_relationship_detection(self):
        rows = [
            {"user_id": "U-1", "order_user_id": "U-1", "age": "25", "city": "NYC", "signup_date": "2024-01-15"},
            {"user_id": "U-2", "order_user_id": "U-2", "age": "30", "city": "NYC", "signup_date": "2024-02-10"},
            {"user_id": "U-3", "order_user_id": "U-3", "age": "35", "city": "LA", "signup_date": "2024-03-05"},
            {"user_id": "U-4", "order_user_id": "U-4", "age": "40", "city": "Chicago", "signup_date": "2024-04-20"},
        ]

        profile = dataset_profiler.profile_dataset(rows, filename="users_orders.csv", upload_id="prof_1")
        assert profile["total_rows"] == 4
        assert profile["total_columns"] == 5
        assert profile["quality_score"] > 80

        # Verify type inference
        col_types = {c["name"]: c["type"] for c in profile["columns"]}
        assert col_types["age"] == "Integer"
        assert col_types["signup_date"] == "Date"
        assert col_types["city"] == "Categorical"

        # Verify relationship detection
        rels = profile["detected_relationships"]
        assert len(rels) >= 1
        assert any(
            (r["source_column"] == "user_id" and r["target_column"] == "order_user_id") or
            (r["source_column"] == "order_user_id" and r["target_column"] == "user_id")
            for r in rels
        )

    # 6. Chatbot Valid Question & Grounded Evidence (Phase 6)
    def test_chatbot_valid_question(self):
        # Insert test rows
        neo4j_service.insert_csv_row("up_test", 1, "test.csv", {"name": "Alice", "role": "Engineer"})
        neo4j_service.insert_csv_row("up_test", 2, "test.csv", {"name": "Bob", "role": "Designer"})

        res = client.post("/api/chat", json={"question": "How many records are in this dataset?"})
        assert res.status_code == 200
        data = res.json()
        assert data["is_grounded"] is True
        assert "MATCH" in data["cypher"]
        assert "records" in data["answer"].lower()
        assert data["execution_time_ms"] >= 0

    # 7. Dangerous Cypher Safety Validation (Phase 6 Security)
    def test_cypher_safety_guardrails(self):
        dangerous_queries = [
            "MATCH (n) DELETE n",
            "MATCH (n) DETACH DELETE n",
            "CREATE (n:Hacker {name: 'evil'})",
            "MERGE (n:Test {id: 1})",
            "MATCH (n) SET n.name = 'modified'",
            "MATCH (n) REMOVE n.name",
            "DROP CONSTRAINT ON (n:CSVRow) ASSERT n.id IS UNIQUE",
            "CALL dbms.security.createUser('hacker', 'password')",
        ]

        for query in dangerous_queries:
            is_safe, err = CypherSafetyValidator.validate_cypher(query)
            assert is_safe is False
            assert "Dangerous operation" in err or "read operation" in err

    # 8. Empty / Unsupported Chatbot Question Handling
    def test_chatbot_empty_question(self):
        res = client.post("/api/chat", json={"question": ""})
        assert res.status_code == 200
        assert "Please ask a question" in res.json()["answer"]

    # 9. Health & Diagnostics Endpoint (Phase 5)
    def test_health_endpoint(self):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert "components" in data
        assert "backend" in data["components"]
        assert "kafka" in data["components"]
        assert "neo4j" in data["components"]
        assert "llm_engine" in data["components"]
