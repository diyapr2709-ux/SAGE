import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import engine, Base
from app.auth.router import router as auth_router
from app.dashboard.router import router as dashboard_router
from app.agents.router import router as run_router
from app.messages.router import router as messages_router
from app.tasks.router import router as tasks_router

Base.metadata.create_all(bind=engine)

logger = logging.getLogger("sage.refresher")


def _scheduled_refresh():
    try:
        from app.agents.data_refresher import run_refresh_cycle
        summary = run_refresh_cycle()
        logger.info("Data refresh complete: %s", summary)
    except Exception as exc:
        logger.warning("Data refresh failed: %s", exc)


_scheduler = BackgroundScheduler(daemon=True)
_scheduler.add_job(_scheduled_refresh, "interval", minutes=30, id="data_refresh",
                   next_run_time=__import__("datetime").datetime.now())  # run immediately on start


@asynccontextmanager
async def lifespan(app: FastAPI):
    _scheduler.start()
    logger.info("Background data refresh scheduler started (30-min interval)")
    yield
    _scheduler.shutdown(wait=False)


app = FastAPI(title="SAGE API", lifespan=lifespan)

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(run_router)
app.include_router(messages_router)
app.include_router(tasks_router)

@app.get("/")
def root():
    return {"message": "SAGE API is running"}