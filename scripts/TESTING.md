# Local testing and cleanup

## Corrected local instance

Use this `HORIZONHRMS-` checkout. Other older HRMS copies are running on ports
5095 and 5173–5175. This checkout uses API port 5096 and frontend port 5185.

After building, start both servers in hidden background processes:

```powershell
powershell -NoProfile -File scripts/start-local.ps1
```

Open http://127.0.0.1:5185/ and check http://localhost:5096/health.
Server logs are in the git-ignored `logs/` directory. The script reports the
process IDs and refuses to reuse occupied ports.

Local configuration is in git-ignored `.env.local` and API
`appsettings.Development.json`. Seeding is disabled, the signing key is persisted
locally, and CORS allows the dedicated frontend. Keep these local files private.
The current admin account and password are unchanged.

Run from the repository root with .NET 10, Node.js, and local SQL Server running:

```powershell
dotnet build backend/HorizonHRMS.slnx
dotnet test backend/HorizonHRMS.slnx
npm ci
npm run build
```

In Codex, SQL Server integration tests require execution outside the restricted
sandbox. The sandbox can report an encryption error even when the local SQL
Server connection works normally. Keep encryption enabled.

Tests explicitly replace the database registration with an isolated
`HorizonHRMS_Tests_<32 hex characters>` database, scope and restore test
configuration, and delete only that exact database when fixtures are disposed.
Cleanup never resolves an application-configured database context.
After tests have finished, check for
leftovers from interrupted runs:

```powershell
powershell -NoProfile -File scripts/cleanup-test-databases.ps1
```

To delete the listed isolated test databases:

```powershell
powershell -NoProfile -File scripts/cleanup-test-databases.ps1 -Execute
```

The cleanup script connects to `localhost` with Windows authentication and
accepts only the exact test database naming format. It does not target the
application database `HorizonHRMS`. Do not run cleanup during a test run.

Alternatively start the corrected application in separate terminals:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project backend/HorizonHRMS.Api --no-launch-profile --urls http://localhost:5096
# In the frontend terminal:
npm run dev -- --host 127.0.0.1 --port 5185 --strictPort
```

The API uses the git-ignored `backend/HorizonHRMS.Api/appsettings.Development.json`
for local database settings. See the root README for configuration details.
Check `http://localhost:5096/health` and open `http://127.0.0.1:5185/`.
