
import argparse
import threading
import time
import subprocess
import sys
from loguru import logger
from tenacity import retry, wait_fixed, stop_after_attempt, retry_if_exception_type

from locusum_ingestor.worker import run_worker
from locusum_ingestor.ai_worker import run_ai_worker

# Robustness: Retry configuration
# Wait 5 seconds between retries, infinite attempts (or very high)
RETRY_POLICY = dict(wait=wait_fixed(5))

@retry(**RETRY_POLICY)
def safe_run_worker():
    """
    Runs the ETL worker with automatic retry on failure.
    """
    logger.info("Starting Processor (ETL) Service...")
    run_worker()

@retry(**RETRY_POLICY)
def safe_run_ai_worker():
    """
    Runs the AI worker with automatic retry on failure.
    """
    logger.info("Starting AI Service...")
    run_ai_worker()

@retry(**RETRY_POLICY)
def safe_run_crawler():
    """
    Runs the Crawler service. 
    Currently runs the Seed Crawler for testing, but can be extended to periodic cron.
    """
    logger.info("Starting Crawler Service...")
    run_all_spiders()
    
    # In a real service, this might be a loop or a scheduler. 
    # For now, we keep the process alive after crawl to emulate a service.
    while True:
        time.sleep(600)

def run_all_spiders():
    """
    Runs all configured spiders to fetch latest news.
    """
    spiders = ["texas_tribune", "dallas_news", "houston_chronicle", "community_impact"]
    logger.info(f"Starting Batch Crawl for spiders: {spiders}")
    
    for spider in spiders:
        logger.info(f"Running spider: {spider}")
        try:
            result = subprocess.run(
                ["scrapy", "crawl", spider],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info(f"Spider {spider} finished successfully.")
                logger.info(f"Stdout: {result.stdout}")
                logger.debug(f"Stderr: {result.stderr}")
            else:
                logger.error(f"Spider {spider} failed with code {result.returncode}")
                logger.error(f"Stderr: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Failed to run spider {spider}: {e}")

    logger.info("All spiders finished.")

def main_all():
    """
    Legacy mode: Run all in threads (Not recommended for robust production but good for dev)
    """
    logger.info("Starting ALL Services (Threaded Mode)...")
    etl_thread = threading.Thread(target=safe_run_worker, name="ETL-Worker", daemon=True)
    ai_thread = threading.Thread(target=safe_run_ai_worker, name="AI-Worker", daemon=True)
    crawler_thread = threading.Thread(target=run_all_spiders, name="Crawler-Worker", daemon=True)

    etl_thread.start()
    ai_thread.start()
    crawler_thread.start()

    try:
        while True:
            time.sleep(1)
            if not etl_thread.is_alive(): logger.error("ETL Thread died"); break
            if not ai_thread.is_alive(): logger.error("AI Thread died"); break
    except KeyboardInterrupt:
        logger.info("Stopping services...")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LocuSum Ingestor Runner")
    parser.add_argument("--mode", choices=["crawler", "processor", "ai", "all"], default="all", help="Service mode to run")
    
    args = parser.parse_args()
    
    if args.mode == "crawler":
        safe_run_crawler()
    elif args.mode == "processor":
        safe_run_worker()
    elif args.mode == "ai":
        safe_run_ai_worker()
    else:
        main_all()
