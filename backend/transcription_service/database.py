import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, DateTime, JSON, Text, UUID as SQLAlchemyUUID, Boolean # Import Boolean
import uuid # Import uuid for default factory
from datetime import datetime

from .config import DATABASE_URL

logger = logging.getLogger(__name__)

# --- Database Engine and Session --- 
try:
    engine = create_async_engine(DATABASE_URL, echo=False) # Set echo=True for debugging SQL
    AsyncSessionFactory = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False # Important for async context
    )
    logger.info("Database engine and session factory created successfully.")
except Exception as e:
    logger.error(f"Failed to create database engine or session factory: {e}", exc_info=True)
    engine = None
    AsyncSessionFactory = None

# --- Base Model --- 
Base = declarative_base()

# --- ORM Model Definition --- 

class TranscriptionSession(Base):
    __tablename__ = "transcription_sessions"

    # Core IDs and Timestamps
    session_id = Column(SQLAlchemyUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    start_time = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_update = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completion_time = Column(DateTime(timezone=True), nullable=True)

    # Session Details
    session_name = Column(String, nullable=False)
    status = Column(String, default="initialized", index=True, nullable=False)
    detected_language = Column(String, default="en")

    # JSON Fields for structured data
    event_metadata = Column(JSON, nullable=True)
    participants = Column(JSON, nullable=True)
    output_preferences = Column(JSON, nullable=True)
    transcription_segments = Column(JSON, nullable=True) # Store final segments array
    markers = Column(JSON, nullable=True)
    audio_chunk_paths = Column(JSON, nullable=True) # Store list of audio chunk file paths

    # Storage and Full Text
    audio_storage_path = Column(String, nullable=True)
    transcript_storage_path = Column(String, nullable=True)
    # Consider TEXT for potentially very long transcripts if storing directly
    full_transcript_text = Column(Text, nullable=True) 

    def __repr__(self):
        return f"<TranscriptionSession(session_id='{self.session_id}', name='{self.session_name}', status='{self.status}')>"

# --- Dependency for getting DB session --- 
async def get_db_session() -> AsyncSession:
    if AsyncSessionFactory is None:
        logger.error("Database session factory is not available.")
        raise RuntimeError("Database not configured correctly.")
        
    async with AsyncSessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()

# --- Utility to create tables (call once at startup or use Alembic) --- 
async def create_tables():
    if engine is None:
         logger.error("Database engine is not available. Cannot create tables.")
         return
    async with engine.begin() as conn:
        logger.info("Creating database tables if they don't exist...")
        # This creates tables based on Base metadata
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Table creation check complete.") 