# Docker Deployment — Horizon HRMS

## Prerequisites
- Docker Desktop (or Docker Engine + Compose) installed and running.

## Quick start
```bash
# From the project root
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5095 (mapped from container port 8080)
- Swagger: http://localhost:5095/swagger
- SQL Server: localhost:1433 (sa / HorizonDev!2026)

On first run the backend applies EF Core migrations and seeds the database (128 employees, 10 users, etc.). All seeded users get password `HorizonDev!2026`.

## Files
- `backend/Dockerfile` — multi-stage .NET 10 build + runtime
- `Dockerfile.frontend` — Vite build + nginx
- `nginx.conf` — SPA fallback + asset caching
- `docker-compose.yml` — orchestrates sqlserver, backend, frontend
- `.dockerignore` — excludes node_modules, bin/obj, secrets

## Configuration
Override via environment variables in `docker-compose.yml`:
- `ConnectionStrings__DefaultConnection`
- `Auth__SigningKey` (required, >= 32 chars)
- `Seed__UserPasswords__<email>` (per-user, required outside Development)
- `Cors__AllowedOrigins__*`
- `VITE_API_BASE_URL` (build arg for frontend)

## Production notes
- Set `ASPNETCORE_ENVIRONMENT=Production` (disables Swagger, requires `Auth:SigningKey`).
- Do not seed demo data in production (`Seed:Enabled=false`).
- Use a managed SQL Server and inject secrets via a secret store, not compose file.
- Pin image tags and scan images before deployment.