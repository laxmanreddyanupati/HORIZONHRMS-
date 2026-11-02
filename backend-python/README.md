# Horizon HRMS — Python Backend (FastAPI)

A Python/FastAPI port of the ASP.NET Core backend. **Status: scaffold / partial parity.**

## Run locally
```bash
cd backend-python
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Open http://localhost:8000/docs (Swagger).

## Configuration (env vars)
- `DATABASE_URL` — SQLAlchemy URL (default: SQL Server via ODBC)
- `JWT_SECRET` — signing key (>= 32 chars)
- `SEED_PASSWORD` — dev seed password
- `ENVIRONMENT` — Development/Production

## Notes
- This is a starter scaffold. Full parity with the C# backend (all 50+ endpoints, seed data, tests) is incremental.
- The C# backend in `backend/` remains the reference implementation.