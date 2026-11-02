# Horizon HRMS — Staging Readiness

**Date:** 2 November 2026
**Scope:** Full-stack (React frontend + ASP.NET Core backend + SQL Server)

## Environment verified
- Node.js v24, npm 11
- .NET SDK 10.0.400
- SQL Server (localhost) — database `HorizonHRMS`
- Frontend: `http://localhost:5173` (Vite)
- Backend: `http://localhost:5095` (ASP.NET Core)

## Commands
- Frontend dev: `npm run dev`
- Frontend build: `npm run build` (tsc -b && vite build)
- Frontend lint: `npm run lint`
- Backend run: `dotnet run --project backend/HorizonHRMS.Api --launch-profile http`
- Backend build: `dotnet build backend/HorizonHRMS.slnx`
- Backend tests: `dotnet test backend/HorizonHRMS.slnx`
- DB migrate: `Database:ApplyMigrations=true` (dev) or `dotnet ef database update`

## Configuration
- Frontend: `.env` (see `.env.example`) — `VITE_API_BASE_URL=http://localhost:5095/api`
- Backend: `backend/HorizonHRMS.Api/appsettings.Development.json` (connection string); `Auth:SigningKey` required outside Development; dev generates ephemeral key + random seed passwords to gitignored `.seed-credentials.dev.txt`.

## Verification evidence
- `npx tsc -b`: pass
- `npm run build`: pass (JS 1,648.46 kB gzip 456.62 kB, CSS 65.73 kB)
- `npm run lint`: pass (warnings only, no errors)
- `dotnet build`: pass (0 warnings, 0 errors)
- `dotnet test`: 33 passed, 0 failed
- Browser QA super-admin: 14 routes, 0 console errors, 0 failed requests
- Browser QA employee: expected 403s on admin endpoints; no unhandled errors

## Known gaps
- Notifications frontend-only (no backend endpoint)
- No SignalR, no forgot/change password endpoints
- Receipt filename-only (no upload endpoint)
- Lint warnings (pre-existing, non-blocking)
- Bundle >500 kB chunk warning (pre-existing)
