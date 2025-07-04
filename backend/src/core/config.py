import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # The default URL assumes Redis is running on localhost, which
    # docker-compose will handle by linking the services.
    REDIS_URL: str = "redis://redis:6379/0"
    if os.getenv("RUN_ENV") == "local":
        REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

    LOG_LEVEL: str = "INFO"
    
    def configure_logging(self):
        logging.basicConfig(
            level=self.LOG_LEVEL,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[logging.StreamHandler()]
        )

settings = Settings()
settings.configure_logging()