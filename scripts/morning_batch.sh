#!/bin/bash

# LocuSum Morning Ingestion Batch
# 1. Starts Ingestor services
# 2. Waits 1 hour
# 3. Stops services
# 4. Logs summary to task_log.txt

# Absolute path to docker-compose file directory
PROJECT_DIR="/home/call3in/Dev/Project/LocuSum/locusum"
LOG_FILE="$PROJECT_DIR/task_log.txt"

# Navigate to project directory
cd "$PROJECT_DIR" || { echo "Failed to cd to $PROJECT_DIR"; exit 1; }

echo "============================================" >> "$LOG_FILE"
echo "[START] Morning Batch: $(date)" >> "$LOG_FILE"

# 1. Start Ingestor Services
echo "Starting ingestor containers..."
/usr/bin/docker-compose up -d ingestor-crawler ingestor-processor ingestor-ai >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start docker-compose services" >> "$LOG_FILE"
    exit 1
fi

# 2. Wait for 1 hour
echo "Waiting for 1 hour..."
sleep 3600

# 3. Stop Ingestor Services
echo "Stopping ingestor containers..."
/usr/bin/docker-compose stop ingestor-crawler ingestor-processor ingestor-ai >> "$LOG_FILE" 2>&1

# 4. Log Summary
echo "Calculating summary stats..."
SUMMARY_COUNT=$(/usr/bin/docker-compose exec -T -e PGPASSWORD=locusum db psql -U locusum -d locusum -t -c "SELECT COUNT(*) FROM articles WHERE summary IS NOT NULL AND created_at::date = CURRENT_DATE;")

# Trim whitespace
SUMMARY_COUNT=$(echo "$SUMMARY_COUNT" | xargs)

echo "[DONE] Batch Finished: $(date)" >> "$LOG_FILE"
echo "Result: $SUMMARY_COUNT articles were summarized today." >> "$LOG_FILE"
echo "============================================" >> "$LOG_FILE"
