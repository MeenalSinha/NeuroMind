"""
Application configuration loaded from environment variables.
All external integrations (Splunk, OpenAI, Anthropic, Neo4j) default to
mock mode so the project runs out of the box without credentials.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # Auth
    NEUROMIND_API_KEY: str = os.getenv("NEUROMIND_API_KEY", "neuromind-dev-key")

    # AI Layer
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    SPLUNK_HOSTED_MODEL_URL: str = os.getenv("SPLUNK_HOSTED_MODEL_URL", "")
    USE_MOCK_AI: bool = os.getenv("USE_MOCK_AI", "true").lower() == "true"

    # Data Layer
    POSTGRES_URL: str = os.getenv("POSTGRES_URL", "")
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "neuromind123")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_MOCK_GRAPH: bool = os.getenv("USE_MOCK_GRAPH", "true").lower() == "true"

    # Splunk Layer
    SPLUNK_HOST: str = os.getenv("SPLUNK_HOST", "")
    SPLUNK_PORT: int = int(os.getenv("SPLUNK_PORT", "8089"))
    SPLUNK_USERNAME: str = os.getenv("SPLUNK_USERNAME", "")
    SPLUNK_PASSWORD: str = os.getenv("SPLUNK_PASSWORD", "")
    SPLUNK_TOKEN: str = os.getenv("SPLUNK_TOKEN", "")
    SPLUNK_MCP_URL: str = os.getenv("SPLUNK_MCP_URL", "")
    USE_MOCK_SPLUNK: bool = os.getenv("USE_MOCK_SPLUNK", "true").lower() == "true"


@lru_cache
def get_settings() -> Settings:
    return Settings()
