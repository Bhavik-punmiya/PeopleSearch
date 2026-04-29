import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PeopleSearch API"
    DATABASE_URL: str = os.path.join(os.getcwd(), "people.db")
    HOST: str = "127.0.0.1"
    PORT: int = 8787
    
    class Config:
        case_sensitive = True

settings = Settings()
