# Free deployment: Cloudflare Pages + Render + Azure SQL

Status: **hosting accounts required before going live**. Deploy this corrected
`HORIZONHRMS-` checkout and branch `deploy/free-hosting-20261117`, not an older
copy. Do not import the repository's old configuration from an uncorrected branch.

## 1. Accounts and repository access

- Create a [Cloudflare account](https://dash.cloudflare.com/sign-up).
- Create an [Azure account](https://azure.microsoft.com/free/) and subscription.
  Identity/payment verification is performed by the provider; do not send payment
  details, account passwords, or verification codes in chat.
- Create a [Render account](https://dashboard.render.com/register) and connect it
  here through the Render integration when available.
- The deployment branch is intended for `laxmanreddyanupati/HORIZONHRMS-`.
  Connect the hosting providers to that repository using the owner's GitHub
  account, then explicitly select `deploy/free-hosting-20261117` for deployment.
  The connected GitHub app is read-only; this machine's owner Git login is used
  to publish the branch instead.
- Verify the corrected branch is on GitHub before deploying it. Never upload
  `.env.local`, API development configuration, local credentials, logs, or reports.

## 2. Create Azure SQL with a spending stop

Use the portal's **Azure SQL Database → Start free** offer. Create a **new, empty**
database named `HorizonHRMS`; a Windows localhost database is not accessible to
Render and will not be uploaded automatically.

Select **Auto-pause the database until next month** at the free monthly limit;
do not select paid overages. Confirm the portal identifies the resource as the
free offer before creating it. Do not add paid elastic pools, managed instances,
or extra services. The free offer provides monthly allowances, not unlimited use.

Create SQL credentials and copy the ADO.NET connection string into Render's
secret `ConnectionStrings__DefaultConnection`. Use encryption with
`TrustServerCertificate=False`; Windows integrated authentication will not work.
Allow the Render service's documented outbound IP ranges in Azure SQL's firewall
after Render assigns them. Do not open the SQL server to all internet addresses.

## 3. Reserve the Cloudflare frontend

Create a Pages project using the Git integration for the corrected repository.
Use the repository root and the React/Vite preset. Note its actual `pages.dev`
hostname. If Cloudflare starts a build before the API URL is configured, the
cloud build intentionally fails instead of publishing localhost API settings.

Build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build:cloud` |
| Build output | `dist` |
| Node version | `24` |
| Production environment variable | `VITE_API_BASE_URL=https://ACTUAL-API.onrender.com/api` |

The app uses hash routing, so no server-side route rewriting is necessary.

## 4. Deploy the API on Render

Choose **New → Blueprint** for the corrected branch's root `render.yaml`.
It creates one Docker web service with **plan: free**, production mode,
`/health`, a generated signing key, and demo seeding disabled.

When prompted, set:

- `ConnectionStrings__DefaultConnection`: Azure SQL encrypted connection string.
- `Cors__AllowedOrigins__0`: exact Cloudflare origin, such as
  `https://your-project.pages.dev` (no trailing slash or path).

`BootstrapAdmin__Email` is already set to `anupatilaxman2@gmail.com`. Render
generates a **new cloud password**, distinct from the local password. Retrieve
it privately in Render's environment settings after provisioning. Startup creates
the administrator only when there are no users; it never resets an existing user.
After first successful login, set `BootstrapAdmin__Enabled=false`, remove
`BootstrapAdmin__Password`, and redeploy. Leave `Auth__SigningKey` unchanged so
ordinary redeployments do not invalidate sessions.

The API honors Render's `PORT`. Render terminates HTTPS; the blueprint explicitly
disables application-layer HTTPS redirection behind that ingress to avoid loops.
Do not expose that container directly over public HTTP outside this setup.

## 5. Connect and verify

Copy the actual Render API address into Cloudflare's `VITE_API_BASE_URL`, including
`/api`, then retry the Cloudflare build. Verify:

1. `https://ACTUAL-API.onrender.com/health` returns `status: ok`.
2. The Pages URL loads and the cloud administrator can sign in.
3. Dashboard, payroll and organization chart show empty states without crashes.
4. Settings contain no fictional company details and notifications show zero.
5. Refresh and redeploy preserve the cloud account and records in Azure SQL.
6. No development settings, passwords, or database strings appear in frontend JS.

## Free-tier operating limits

- Render free services sleep after idle periods, so the first request may be slow.
- Azure SQL may pause when idle or when its monthly free compute limit is reached.
- Render's filesystem is ephemeral. **Persistent receipt/document uploads are not
  enabled by this deployment.** The current tracked API handles receipt filenames,
  not durable cloud receipt storage. Configure object storage before adding uploads.
- This is a development/demo deployment; it has no always-on availability promise.

## Local validation

```powershell
dotnet test backend/HorizonHRMS.slnx
dotnet publish backend/HorizonHRMS.Api -c Release -o deployment-output/api
$env:VITE_API_BASE_URL = 'https://ACTUAL-API.onrender.com/api'
npm run build:cloud
docker build -f backend/Dockerfile -t horizon-hrms-api .
```

Docker Desktop must be running for the last command. `.dockerignore` excludes
development secrets, verification outputs, uploads, and local build artifacts.
Do not publish local `dist/` compiled with a localhost URL; rebuild using the
actual deployed API address.

Provider references: [Render Blueprints](https://render.com/docs/blueprint-spec),
[Cloudflare build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/),
[Azure SQL free tier](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-tier).
