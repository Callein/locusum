
import time
import sys
import os
from sqlalchemy import text
from loguru import logger
from locusum_ingestor.models.main_db import get_session, Article
from locusum_ingestor.services.ai_service import get_ai_service
from sqlmodel import select

def run_ai_worker():
    """
    AI Enrichment Worker:
    1. Fetch articles where summary IS NULL (limit 10).
    2. Generate Summary & Embedding via AIService.
    3. Update DB.
    """
    logger.info("Starting Locusum AI Worker...")
    
    try:
        ai_service = get_ai_service()
        logger.info("AIService initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize AIService: {e}")
        return

    session = get_session()
    idle_count = 0
    MAX_IDLE_RETRIES = 3

    while True:
        try:
            # Fetch batch of 10 articles that need processing
            # Check for missing summary OR missing embedding
            statement = select(Article).where((Article.summary == None) | (Article.embedding == None)).limit(10)
            articles = session.exec(statement).all()
            
            if not articles:
                idle_count += 1
                if idle_count >= MAX_IDLE_RETRIES:
                    # Logic changed: Do not exit, just wait longer
                    logger.info(f"No articles to enrich. Sleeping for 20s...")
                    time.sleep(20)
                    continue
                
                logger.info(f"No articles to enrich (Idle {idle_count}/{MAX_IDLE_RETRIES}). Sleeping for 10s...")
                time.sleep(10)
                continue
            
            # Reset idle count
            idle_count = 0
            
            logger.info(f"Enriching batch of {len(articles)} articles...")
            
            for article in articles:
                try:
                    summary_updated = False
                    embedding_updated = False

                    # 1. Summarize (if missing or failed)
                    if not article.summary or article.summary == "(Summary Failed)":
                        if not article.content_text:
                            logger.warning(f"Skipping empty content article ID {article.article_id}")
                            continue

                        summary = ai_service.summarize(article.content_text)
                        if not summary:
                            logger.warning(f"Summary generation failed for ID {article.article_id}. Skipping DB update (will retry).")
                        else:
                            article.summary = summary
                            summary_updated = True

                    # 2. Embed (if missing)
                    if not article.embedding:
                        # Ensure we have summary to embed
                        if not article.summary:
                             continue

                        embedding = ai_service.embed(article.summary)
                        if not embedding:
                            logger.warning(f"Embedding generation failed for ID {article.article_id}. Will retry.")
                        else:
                            article.embedding = embedding
                            embedding_updated = True
                    
                    # 3. Update DB only if changes were made
                    if summary_updated or embedding_updated:
                        session.add(article)
                        session.commit()
                        logger.info(f"Enriched Article ID {article.article_id}: Summary={summary_updated}, Embedding={embedding_updated}")
                    
                    session.add(article)
                    session.commit()
                    logger.info(f"Enriched Article ID {article.article_id}: {article.title[:20]}...")

                    # Rate limit respect for Free Tier
                    time.sleep(5)

                except Exception as ex:
                    logger.error(f"Error enriching article {article.article_id}: {ex}")
                    session.rollback()
            
        except KeyboardInterrupt:
            logger.info("AI Worker stopping...")
            break
        except Exception as e:
            logger.error(f"AI Worker loop error: {e}")
            try:
                session.rollback()
            except Exception as rb_ex:
                logger.error(f"Failed to rollback session: {rb_ex}")
            time.sleep(5)

if __name__ == "__main__":
    run_ai_worker()
