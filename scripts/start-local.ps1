$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $repo 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

# Use separate ports so other HRMS checkouts cannot serve stale code here.
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:VITE_API_BASE_URL = 'http://localhost:5096/api'
foreach ($port in @(5096, 5185)) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Stop that instance before starting this checkout."
    }
}
$api = Start-Process -FilePath 'dotnet' -ArgumentList @('run', '--project', 'backend/HorizonHRMS.Api', '--no-launch-profile', '--no-build', '--urls', 'http://localhost:5096') -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'api.log') -RedirectStandardError (Join-Path $logDirectory 'api-error.log') -PassThru
try {
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($api.HasExited) { throw 'API exited. Check logs/api-error.log.' }
        try {
            $health = Invoke-RestMethod 'http://localhost:5096/health' -TimeoutSec 2
            if ($health.status -eq 'ok') { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (!$ready) { throw 'API did not become healthy. Check logs/api.log.' }
    $frontend = Start-Process -FilePath 'node' -ArgumentList @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5185', '--strictPort') -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'frontend.log') -RedirectStandardError (Join-Path $logDirectory 'frontend-error.log') -PassThru
    Write-Output "API PID: $($api.Id); frontend PID: $($frontend.Id)"
    Write-Output 'Application: http://127.0.0.1:5185/'
    Write-Output 'API health: http://localhost:5096/health'
} catch {
    if (!$api.HasExited) { $api.Kill() }
    throw
}
