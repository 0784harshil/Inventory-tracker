
$ErrorActionPreference = "Stop"

# Load Config
$configPath = Join-Path $PSScriptRoot "config.ini"
if (-not (Test-Path $configPath)) { Write-Error "Config file not found!"; exit 1 }

$config = Get-Content $configPath
$server = $null
$db = $null
$windowsAuth = $true

foreach ($line in $config) {
    if ($line -match "SQL_SERVER\s*=\s*(.*)") { $server = $matches[1].Trim() }
    if ($line -match "SQL_DATABASE\s*=\s*(.*)") { $db = $matches[1].Trim() }
    if ($line -match "WINDOWS_AUTH\s*=\s*(.*)") { $windowsAuth = ($matches[1].Trim() -eq "true") }
}

Write-Host "Applying Schema to: $server -> $db"

if (-not $server -or -not $db) { Write-Error "Missing server or db in config"; exit 1 }

# Connection String
$connStr = "Server=$server;Database=$db;Integrated Security=True;TrustServerCertificate=True"
if (-not $windowsAuth) {
    Write-Warning "SQL Auth detected in config, but this script defaults to Windows Auth for safely running locally. If you need SQL Auth, please edit this script."
}

# Run SQL
$sqlPath = Join-Path $PSScriptRoot "UpdateSchema.sql"
if (-not (Test-Path $sqlPath)) { Write-Error "UpdateSchema.sql invalid"; exit 1 }

$sql = Get-Content $sqlPath -Raw
# Split by GO for batch execution
$batches = $sql -split "(?m)^\s*GO\s*$"

try {
    $conn = New-Object System.Data.SqlClient.SqlConnection $connStr
    $conn.Open()
    Write-Host "Connected!"
    
    foreach ($batch in $batches) {
        if (-not [string]::IsNullOrWhiteSpace($batch)) {
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = $batch
            $cmd.ExecuteNonQuery()
        }
    }
    Write-Host "Schema Updated Successfully!" -ForegroundColor Green
} catch {
    Write-Error "SQL Error: $_"
} finally {
    if ($conn) { $conn.Close() }
}
Read-Host "Press Enter to Exit"
