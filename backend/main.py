from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.applications import router as applications_router

app = FastAPI(
    title="SevaSathi API",
    description="AI-powered government certificate workflow",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to SevaSathi API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}