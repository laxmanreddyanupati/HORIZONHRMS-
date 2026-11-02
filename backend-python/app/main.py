from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import Base, engine
from app.routers import auth, employees, organization

settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    from sqlalchemy.orm import Session
    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.models.entities import User
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(User(
                id="USR-001", employee_id="HZT-0001", name="Vikram Rao",
                email="vikram.rao@horizontech.example",
                password_hash=hash_password(settings.seed_password),
                role="super-admin", status="Active", mfa_enabled=True,
            ))
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "HorizonHRMS.Api (Python)", "utc": __import__("datetime").datetime.utcnow().isoformat()}


app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(organization.router)