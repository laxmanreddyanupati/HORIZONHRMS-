param([switch]$Execute)

$ErrorActionPreference = 'Stop'
# Matches only the isolated databases created by HrmsWebApplicationFactory.
$names = & sqlcmd -S localhost -E -C -b -h -1 -W -Q "SET NOCOUNT ON; SELECT name FROM sys.databases WHERE name LIKE 'HorizonHRMS[_]Tests[_]%';"
if ($LASTEXITCODE -ne 0) { throw 'Could not list local test databases.' }
$databases = @($names | ForEach-Object { $_.Trim() } | Where-Object { $_ -cmatch '^HorizonHRMS_Tests_[0-9a-f]{32}$' })
if ($databases.Count -eq 0) { Write-Output 'No isolated test databases found.'; return }
foreach ($database in $databases) {
    if (!$Execute) { Write-Output "Would remove: $database"; continue }
    & sqlcmd -S localhost -E -C -b -Q "ALTER DATABASE [$database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$database];"
    if ($LASTEXITCODE -ne 0) { throw "Failed to remove $database" }
    Write-Output "Removed: $database"
}
