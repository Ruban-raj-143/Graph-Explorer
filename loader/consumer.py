import json
import logging
import os
import signal
import sys
import time
from typing import Any, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("loader")

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    os.getenv("KAFKA_BROKER", "kafka:9092")
)
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "csv-rows")
KAFKA_CONSUMER_GROUP = os.getenv("KAFKA_CONSUMER_GROUP", "neo4j-csv-consumer")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

running = True


def signal_handler(signum, frame):
    global running
    logger.info("Shutdown signal received (%s). Exiting consumer loop...", signum)
    running = False


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def wait_and_connect_neo4j(max_retries: int = 30, delay: int = 2):
    """Retry connecting to Neo4j until available."""
    from neo4j import GraphDatabase
    logger.info("Connecting to Neo4j at %s...", NEO4J_URI)
    for attempt in range(1, max_retries + 1):
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            driver.verify_connectivity()
            logger.info("NEO4J_CONNECTED: Verified connection on attempt %d/%d", attempt, max_retries)
            return driver
        except Exception as exc:
            logger.warning(
                "NEO4J_ERROR: Attempt %d/%d failed: %s. Retrying in %d seconds...",
                attempt, max_retries, exc, delay
            )
            time.sleep(delay)
    logger.error("Could not connect to Neo4j after %d attempts", max_retries)
    return None


def wait_and_create_consumer(max_retries: int = 30, delay: int = 2):
    """Retry creating KafkaConsumer until broker is ready."""
    from kafka import KafkaConsumer
    from kafka.errors import NoBrokersAvailable

    logger.info(
        "Connecting to Kafka at %s (topic: %s, group: %s)...",
        KAFKA_BOOTSTRAP_SERVERS, KAFKA_TOPIC, KAFKA_CONSUMER_GROUP
    )
    for attempt in range(1, max_retries + 1):
        try:
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=[KAFKA_BOOTSTRAP_SERVERS],
                group_id=KAFKA_CONSUMER_GROUP,
                auto_offset_reset="earliest",
                enable_auto_commit=False,  # Manual commit after successful Neo4j write
                value_deserializer=lambda x: json.loads(x.decode("utf-8")),
                consumer_timeout_ms=1000,
            )
            logger.info(
                "CONSUMER_STARTED: Subscribed to topic '%s' on attempt %d/%d",
                KAFKA_TOPIC, attempt, max_retries
            )
            return consumer
        except (NoBrokersAvailable, Exception) as exc:
            logger.warning(
                "CONSUMER_ERROR: Attempt %d/%d failed: %s. Retrying in %d seconds...",
                attempt, max_retries, exc, delay
            )
            time.sleep(delay)
    logger.error("Could not connect to Kafka after %d attempts", max_retries)
    return None


def process_message(neo4j_driver, message_data: Dict[str, Any]) -> bool:
    """
    Validate and ingest consumed CSV row into Neo4j graph.
    Generic Schema:
      MERGE (ds:Dataset { upload_id: $upload_id })
      ON CREATE SET ds.filename = $source_file, ds.created_at = timestamp()
      MERGE (r:CSVRow { upload_id: $upload_id, row_number: $row_number })
      SET r += $data
      MERGE (ds)-[:CONTAINS_ROW]->(r)
    """
    upload_id = message_data.get("upload_id")
    row_number = message_data.get("row_number")
    source_file = message_data.get("source_file", "unknown.csv")
    data = message_data.get("data", {})

    if not upload_id or row_number is None:
        logger.warning("ROW_FAILED: Malformed message missing upload_id or row_number: %s", message_data)
        return False

    query = """
    MERGE (ds:Dataset { upload_id: $upload_id })
    ON CREATE SET ds.filename = $source_file, ds.created_at = timestamp()
    MERGE (r:CSVRow { upload_id: $upload_id, row_number: $row_number })
    SET r += $data
    MERGE (ds)-[:CONTAINS_ROW]->(r)
    """

    try:
        with neo4j_driver.session(database=NEO4J_DATABASE) as session:
            session.run(
                query,
                upload_id=upload_id,
                row_number=row_number,
                source_file=source_file,
                data=data,
            )
        logger.info(
            "ROW_INSERTED: upload_id=%s row_number=%d file=%s",
            upload_id, row_number, source_file
        )
        return True
    except Exception as exc:
        logger.error(
            "ROW_FAILED: upload_id=%s row_number=%d: %s",
            upload_id, row_number, exc
        )
        return False


def main():
    logger.info("CONSUMER_STARTED: Starting Loader service (Kafka Consumer -> Neo4j)...")

    neo4j_driver = wait_and_connect_neo4j(max_retries=30, delay=2)
    consumer = wait_and_create_consumer(max_retries=30, delay=2)

    if not consumer:
        logger.error("Failed to initialize Kafka consumer. Exiting.")
        sys.exit(1)

    logger.info("Loader initialized. Listening for messages on '%s'...", KAFKA_TOPIC)

    last_heartbeat = time.time()
    try:
        while running:
            message_batch = consumer.poll(timeout_ms=1000)
            if message_batch:
                for topic_partition, records in message_batch.items():
                    for record in records:
                        msg_val = record.value
                        logger.info(
                            "MESSAGE_RECEIVED: topic=%s partition=%d offset=%d upload_id=%s row=%s",
                            record.topic, record.partition, record.offset,
                            msg_val.get("upload_id"), msg_val.get("row_number")
                        )

                        success = True
                        if neo4j_driver:
                            success = process_message(neo4j_driver, msg_val)

                        # Commit offset only after successful processing
                        if success:
                            consumer.commit()

            if time.time() - last_heartbeat > 30:
                logger.info("CONSUMER_HEARTBEAT: Loader active on topic '%s'...", KAFKA_TOPIC)
                last_heartbeat = time.time()

    except Exception as exc:
        logger.error("CONSUMER_ERROR: Error in consumer loop: %s", exc, exc_info=True)
    finally:
        logger.info("Closing Kafka consumer and Neo4j driver...")
        try:
            consumer.close()
        except Exception:
            pass
        if neo4j_driver:
            try:
                neo4j_driver.close()
            except Exception:
                pass
        logger.info("Loader service stopped cleanly.")


if __name__ == "__main__":
    main()
