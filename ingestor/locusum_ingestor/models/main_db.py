
from typing import Optional
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel, create_engine, Session
from sqlalchemy import Column, BigInteger
from pgvector.sqlalchemy import Vector
import os

from dotenv import load_dotenv

load_dotenv()

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Default to Docker service name 'db' if not specified
    user = os.getenv("POSTGRES_USER", "locusum")
    password = os.getenv("POSTGRES_PASSWORD", "locusum_password")
    host = os.getenv("POSTGRES_HOST", "db")
    db_name = os.getenv("POSTGRES_DB", "locusum")
    DATABASE_URL = f"postgresql://{user}:{password}@{host}:5432/{db_name}"

engine = create_engine(DATABASE_URL, echo=False)

class Article(SQLModel, table=True):
    __tablename__ = "articles"

    article_id: Optional[int] = Field(default=None, sa_column=Column(BigInteger, primary_key=True))
    raw_id: str = Field(index=True, description="Reference to SQLite raw_articles.id")
    original_url: str = Field(unique=True, index=True)
    source: str
    region_code: Optional[str] = Field(default=None, index=True)
    author: Optional[str] = None
    image_url: Optional[str] = None
    title: Optional[str] = None
    content_text: str
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    category: Optional[str] = None
    sentiment_score: Optional[float] = None
    
    # pgvector embedding column 
    # Plan says 1536 (OpenAI), but we are using Ollama/Nomic (768). 
    # Keeping 768 for compatibility with current model config, but field name is embedding.
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(768)))
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

from sqlalchemy import text

def create_db_and_tables():
    # Check for RESET_DB env var to drop tables
    # Also if we need to force update schema for dev, we can set RESET_DB=true in docker-compose
    if os.getenv("RESET_DB", "false").lower() == "true":
        print("RESET_DB is set to true. Dropping all tables in Main DB...")
        SQLModel.metadata.drop_all(engine)
        
    with Session(engine) as session:
        session.exec(text("CREATE EXTENSION IF NOT EXISTS vector"))
        session.commit()
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
