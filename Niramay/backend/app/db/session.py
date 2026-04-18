from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# In a production environment, this would be a real PostgreSQL URL
# For standalone/demo, we allow fallback to SQLite if needed, but the target is PostgreSQL
# For standalone/demo, we use SQLite by default
SQLALCHEMY_DATABASE_URL = "sqlite:///./niramay.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
