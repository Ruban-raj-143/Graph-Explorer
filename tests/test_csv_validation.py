import asyncio
import io
import os
import sys
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "api")))

from app.main import app

client = TestClient(app)


def test_valid_csv():
    print("--- Test 1: Valid CSV ---")
    csv_content = b"customer_id,name,group,status\n101,Arun,Billing,Active\n102,Meera,Engineering,Active\n103,Vikram,Support,Pending\n104,Pooja,Design,Active\n105,Karan,Product,Active\n106,Sneha,Sales,Inactive\n"
    response = client.post(
        "/ingest",
        files={"file": ("customers.csv", csv_content, "text/csv")}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 202, f"Expected 202, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "queued"
    assert data.get("rows_received") == 6
    assert data.get("job_id", "").startswith("job_")
    assert len(data.get("preview", [])) == 5
    print("✓ Test 1 Passed!\n")


def test_empty_csv():
    print("--- Test 2: Empty CSV (0 bytes) ---")
    response = client.post(
        "/ingest",
        files={"file": ("empty.csv", b"", "text/csv")}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "failed"
    assert "empty" in data.get("error", "").lower()
    print("✓ Test 2 Passed!\n")


def test_header_only_csv():
    print("--- Test 3: CSV with Header Only ---")
    csv_content = b"customer_id,name,group,status\n"
    response = client.post(
        "/ingest",
        files={"file": ("header_only.csv", csv_content, "text/csv")}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "failed"
    assert "no data rows" in data.get("error", "").lower()
    print("✓ Test 3 Passed!\n")


def test_malformed_csv():
    print("--- Test 4: Malformed CSV (Unequal columns) ---")
    csv_content = b"customer_id,name,group,status\n101,Arun,Billing,Active\n102,Meera,Engineering\n"
    response = client.post(
        "/ingest",
        files={"file": ("malformed.csv", csv_content, "text/csv")}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "failed"
    assert "parsing error" in data.get("error", "").lower()
    print("✓ Test 4 Passed!\n")


def test_non_csv_file():
    print("--- Test 5: Non-CSV File (.txt) ---")
    response = client.post(
        "/ingest",
        files={"file": ("document.txt", b"This is a text file", "text/plain")}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "failed"
    assert "must be a csv" in data.get("error", "").lower()
    print("✓ Test 5 Passed!\n")


def test_binary_file_masked_as_csv():
    print("--- Test 6: Binary file masked as .csv ---")
    binary_content = b"\x00\x01\x02\x03\x04\x05GIF89a"
    response = client.post(
        "/ingest",
        files={"file": ("fake.csv", binary_content, "text/csv")}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "failed"
    print("✓ Test 6 Passed!\n")


if __name__ == "__main__":
    test_valid_csv()
    test_empty_csv()
    test_header_only_csv()
    test_malformed_csv()
    test_non_csv_file()
    test_binary_file_masked_as_csv()
    print("========================================")
    print("ALL PHASE 2 VALIDATION TESTS PASSED!")
    print("========================================")
