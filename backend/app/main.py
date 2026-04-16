from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.auth.router import router as auth_router
from app.dashboard.router import router as dashboard_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SAGE API")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)

@app.get("/")
def root():
    return {"message": "SAGE API is running"}