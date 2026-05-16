from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend configuration, loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    cors_origins: list[str] = ["http://localhost:3000"]
    database_url: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""


settings = Settings()
