from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import planning

app = FastAPI(
    title="OviCore Next API",
    version="0.1.0",
    description="Breeder / Hatchery / Broiler planning-first API starter.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ovicore-next-demo.vercel.app",
        "https://ovicore-next-demo-pmf6lq8omc-ovi-core.vercel.app",
        "https://demo.ovicore.com.au",
        "https://app.ovicore.com.au",
    ]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(planning.router, prefix="/api/planning", tags=["Planning"])


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "ovicore-next-api",
        "focus": "breeder-hatchery-broiler-planning",
    }
