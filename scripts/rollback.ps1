param(
  [string]$BackupFile = '.tmp/backup/crm_sales_20260306.sql',
  [string]$PreviewDatabase = 'crm_sales_rollback_preview',
  [switch]$PromoteToPrimary,
  [switch]$RestartApp
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

if ($PreviewDatabase -notmatch '^[A-Za-z0-9_]+$') {
  throw "Invalid preview database name: $PreviewDatabase"
}

function Resolve-BackupPath {
  param([string]$InputPath)

  if ([System.IO.Path]::IsPathRooted($InputPath)) {
    return (Resolve-Path $InputPath).Path
  }

  return (Resolve-Path (Join-Path $repoRoot $InputPath)).Path
}

function Invoke-DockerCommand {
  param(
    [string]$Step,
    [string[]]$CommandArgs
  )

  Write-Host "==> $Step"
  & docker @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed at step: $Step"
  }
}

function Invoke-MysqlImport {
  param(
    [string]$Database,
    [string]$SqlFile
  )

  $escapedPath = $SqlFile.Replace('"', '""')
  cmd /c "type ""$escapedPath"" | docker exec -i crm-mysql mysql -uroot -pcrm_password_123 $Database"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to import backup into database [$Database]."
  }
}

$backupPath = Resolve-BackupPath -InputPath $BackupFile
Write-Host "Using backup file: $backupPath"

# Non-destructive preview restore to a temporary database.
$previewSql = "DROP DATABASE IF EXISTS $PreviewDatabase; CREATE DATABASE $PreviewDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Invoke-DockerCommand -Step "Create preview database [$PreviewDatabase]" -CommandArgs @(
  'exec', 'crm-mysql', 'mysql', '-uroot', '-pcrm_password_123',
  '-e', $previewSql
)

Invoke-DockerCommand -Step "Check preview database [$PreviewDatabase] exists" -CommandArgs @(
  'exec', 'crm-mysql', 'mysql', '-uroot', '-pcrm_password_123',
  '-Nse', "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$PreviewDatabase';"
)

Write-Host "==> Import backup into preview database [$PreviewDatabase]"
Invoke-MysqlImport -Database $PreviewDatabase -SqlFile $backupPath

Invoke-DockerCommand -Step "Validate preview database [$PreviewDatabase] key table counts" -CommandArgs @(
  'exec', 'crm-mysql', 'mysql', '-uroot', '-pcrm_password_123', '-D', $PreviewDatabase,
  '-e', "SELECT 'customers' AS t, COUNT(*) AS c FROM customers UNION ALL SELECT 'opportunities', COUNT(*) FROM opportunities UNION ALL SELECT 'call_records', COUNT(*) FROM call_records UNION ALL SELECT 'knowledge_articles', COUNT(*) FROM knowledge_articles UNION ALL SELECT 'knowledge_categories', COUNT(*) FROM knowledge_categories;"
)

if ($PromoteToPrimary) {
  Write-Host '==> Promote preview backup to primary database [crm_sales]'
  Invoke-DockerCommand -Step 'Reset primary database [crm_sales]' -CommandArgs @(
    'exec', 'crm-mysql', 'mysql', '-uroot', '-pcrm_password_123',
    '-e', 'DROP DATABASE IF EXISTS crm_sales; CREATE DATABASE crm_sales CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
  )

  Write-Host '==> Import backup into primary database [crm_sales]'
  Invoke-MysqlImport -Database 'crm_sales' -SqlFile $backupPath

  Invoke-DockerCommand -Step 'Validate primary database [crm_sales] key table counts' -CommandArgs @(
    'exec', 'crm-mysql', 'mysql', '-uroot', '-pcrm_password_123', '-D', 'crm_sales',
    '-e', "SELECT 'customers' AS t, COUNT(*) AS c FROM customers UNION ALL SELECT 'opportunities', COUNT(*) FROM opportunities UNION ALL SELECT 'call_records', COUNT(*) FROM call_records UNION ALL SELECT 'knowledge_articles', COUNT(*) FROM knowledge_articles UNION ALL SELECT 'knowledge_categories', COUNT(*) FROM knowledge_categories;"
  )
}

if ($RestartApp) {
  Invoke-DockerCommand -Step 'Restart application containers (server, web)' -CommandArgs @('compose', 'restart', 'server', 'web')
}

Write-Host 'Rollback script completed.'
Write-Host '- Preview restore: done'
$promoteState = 'skipped'
if ($PromoteToPrimary.IsPresent) { $promoteState = 'done' }
$restartState = 'skipped'
if ($RestartApp.IsPresent) { $restartState = 'done' }
Write-Host ("- Promote to primary: " + $promoteState)
Write-Host ("- Restart app: " + $restartState)
