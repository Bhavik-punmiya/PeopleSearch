from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.api.endpoints import search, ingest
import uvicorn
import os
import sys

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])

@app.on_event("startup")
async def startup_event():
    init_db()

if __name__ == "__main__":
    # CRITICAL: Disable reload and workers in production/EXE mode
    # This prevents the "process spawning" bug
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8787, 
        reload=False, 
        workers=1
    )
