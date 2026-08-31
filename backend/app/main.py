from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import cvi, health, incidents, routing, ussd

app = FastAPI(
    title="Ramani",
    description="Climate resilience engine for informal urban settlements.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cvi.router)
app.include_router(routing.router)
app.include_router(incidents.router)
app.include_router(ussd.router)
