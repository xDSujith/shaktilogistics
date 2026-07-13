param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$BackupDir = $env:BACKUP_DIR,
  [int]$RetentionDays = 30
)

if (-not $DatabaseUrl) {
  $envFile = Join-Path $PSScriptRoot "..\.env"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^DATABASE_URL=(.+)$') {
        $DatabaseUrl = $matches[1]
      }
    }
  }
}

if (-not $DatabaseUrl) {
  Write-Host "[backup] ERROR: DATABASE_URL is required"
  exit 1
}

if (-not $BackupDir) {
  $BackupDir = Join-Path $PSScriptRoot "..\backups"
}

if (-not (Test-Path $BackupDir)) {
  $BackupDir = (New-Item -ItemType Directory -Path $BackupDir -Force).FullName
}

# Locate pg_dump
$pgDump = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
if (-not $pgDump) {
  $candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { $pgDump = $c; break }
  }
}
if (-not $pgDump) {
  Write-Host "[backup] ERROR: pg_dump.exe not found"
  exit 1
}

# Parse DATABASE_URL
$uri = [uri]$DatabaseUrl
$user = $uri.UserInfo.Split(':')[0]
$pass = $uri.UserInfo.Split(':')[1]
$hostname = $uri.Host
$port = $uri.Port
if ($port -le 0) { $port = 5432 }
$db = $uri.AbsolutePath.TrimStart('/')

$date = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $BackupDir "shakti_logistics_$date.sql"

Write-Host "[backup] Starting backup of $db to $outFile"

$env:PGPASSWORD = $pass
$result = & $pgDump --host=$hostname --port=$port --username=$user --dbname=$db --format=plain --no-owner --no-acl --file=$outFile 2>&1

if ($LASTEXITCODE -ne 0) {
  Write-Host "[backup] FAILED (exit $LASTEXITCODE): $result"
  Remove-Item $outFile -Force -ErrorAction SilentlyContinue
  exit 1
}

$size = (Get-Item $outFile).Length
Write-Host "[backup] Complete: $([math]::Round($size / 1KB, 1)) KB"

$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "shakti_logistics_*.sql" | Where-Object { $_.CreationTime -lt $cutoff } | ForEach-Object {
  Remove-Item $_.FullName -Force
  Write-Host "[backup] Purged old backup: $($_.Name)"
}

exit 0
