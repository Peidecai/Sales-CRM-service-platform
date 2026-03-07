param(
  [switch]$Build,
  [int]$HealthTimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

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

function Get-StatusCode {
  param([string]$Url)
  try {
    return (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5).StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    return 0
  }
}

Invoke-DockerCommand -Step 'Start database dependencies (mysql, redis)' -CommandArgs @('compose', 'up', '-d', 'mysql', 'redis')

if ($Build) {
  Invoke-DockerCommand -Step 'Deploy application with image build (server, web)' -CommandArgs @('compose', 'up', '-d', '--build', 'server', 'web')
} else {
  Invoke-DockerCommand -Step 'Deploy application without rebuild (server, web)' -CommandArgs @('compose', 'up', '-d', 'server', 'web')
}

Write-Host '==> Waiting for health endpoints'
$deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
$healthOk = $false
$readyOk = $false

while ((Get-Date) -lt $deadline) {
  $healthCode = Get-StatusCode -Url 'http://localhost:3000/api/v1/health'
  $readyCode = Get-StatusCode -Url 'http://localhost:3000/api/v1/health/ready'

  if ($healthCode -eq 200) { $healthOk = $true }
  if ($readyCode -eq 200) { $readyOk = $true }

  if ($healthOk -and $readyOk) { break }
  Start-Sleep -Seconds 3
}

if (-not ($healthOk -and $readyOk)) {
  throw "Health check failed within timeout. /health=$healthOk /health/ready=$readyOk"
}

Write-Host '==> Show running containers'
cmd /c docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to list running containers.'
}
Write-Host 'Deployment completed and health checks passed.'
