# Claude Code 自动化审查脚本
# 用法:
#   .\claude-review.ps1
#   .\claude-review.ps1 -StartFrom 3
#   .\claude-review.ps1 -SaveReports -MaxTurns 60
#   .\claude-review.ps1 -Help

param(
    [string]$TaskFile  = ".\claude-review-tasks.txt",
    [string]$Model     = "claude-opus-4-6",
    [int]$MaxTurns     = 40,
    [int]$StartFrom    = 1,
    [switch]$SaveReports,
    [string]$ReportDir = ".\review-output",
    [switch]$ShowCmd,
    [switch]$Help
)

$ErrorActionPreference = "Continue"

if ($Help) {
    Write-Host ""
    Write-Host "Claude Code Auto Review Script" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\claude-review.ps1 [-TaskFile path] [-Model name] [-MaxTurns N] [-StartFrom N] [-SaveReports] [-ShowCmd]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -TaskFile    Task file path (default: .\claude-review-tasks.txt)"
    Write-Host "  -Model       Claude model (default: claude-opus-4-6)"
    Write-Host "  -MaxTurns    Max turns per task (default: 40)"
    Write-Host "  -StartFrom   Resume from task N (default: 1)"
    Write-Host "  -SaveReports Save each task output to -ReportDir"
    Write-Host "  -ReportDir   Report output dir (default: .\review-output)"
    Write-Host "  -ShowCmd     Print the claude command before running"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\claude-review.ps1"
    Write-Host "  .\claude-review.ps1 -StartFrom 5"
    Write-Host "  .\claude-review.ps1 -SaveReports -MaxTurns 60"
    Write-Host ""
    exit 0
}

function Write-Log {
    param([string]$Msg, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts][$Level] $Msg"
    switch ($Level) {
        "ERROR"   { Write-Host $line -ForegroundColor Red }
        "WARN"    { Write-Host $line -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $line -ForegroundColor Green }
        "HEADER"  { Write-Host $line -ForegroundColor Cyan }
        "DEBUG"   { Write-Host $line -ForegroundColor DarkGray }
        default   { Write-Host $line }
    }
}

# Check claude CLI
try {
    $ver = & claude --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Claude CLI ready: $ver" "SUCCESS"
    } else {
        Write-Log "Claude CLI not found. Run: npm install -g @anthropic-ai/claude-code" "ERROR"
        exit 1
    }
} catch {
    Write-Log "Claude CLI not found. Run: npm install -g @anthropic-ai/claude-code" "ERROR"
    exit 1
}

# Check task file
if (-not (Test-Path $TaskFile)) {
    Write-Log "Task file not found: $TaskFile" "ERROR"
    exit 1
}

# Parse tasks (blank-line separated, # = comment)
$rawLines = Get-Content -Path $TaskFile -Encoding UTF8
$tasks    = @()
$current  = @()

foreach ($line in $rawLines) {
    if ($line.TrimStart().StartsWith("#")) { continue }
    if ($line.Trim() -eq "") {
        if ($current.Count -gt 0) {
            $tasks += ($current -join "`n")
            $current = @()
        }
    } else {
        $current += $line
    }
}
if ($current.Count -gt 0) {
    $tasks += ($current -join "`n")
}

if ($tasks.Count -eq 0) {
    Write-Log "No valid tasks found in: $TaskFile" "ERROR"
    exit 1
}

Write-Log "Loaded $($tasks.Count) tasks. Starting from task $StartFrom." "HEADER"
Write-Log "Model: $Model | MaxTurns: $MaxTurns" "INFO"

# Prepare report dir
if ($SaveReports) {
    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir | Out-Null
        Write-Log "Created report dir: $ReportDir" "INFO"
    }
}

$successCount = 0
$failCount    = 0

for ($i = 0; $i -lt $tasks.Count; $i++) {
    $taskIndex = $i + 1
    if ($taskIndex -lt $StartFrom) { continue }

    $prompt = $tasks[$i].Trim()
    $short  = if ($prompt.Length -gt 100) { $prompt.Substring(0, 100) + "..." } else { $prompt }

    Write-Host ""
    Write-Log "--- Task [$taskIndex/$($tasks.Count)] ---" "HEADER"
    Write-Log $short "INFO"

    if ($ShowCmd) {
        Write-Log "CMD: echo prompt | claude --model $Model --print --dangerously-skip-permissions --output-format text --max-turns $MaxTurns" "DEBUG"
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        $output = $prompt | & claude `
            --model $Model `
            --print `
            --dangerously-skip-permissions `
            --output-format text `
            --max-turns $MaxTurns `
            2>&1

        $exitCode = $LASTEXITCODE
        $sw.Stop()
        $elapsed = [Math]::Round($sw.Elapsed.TotalSeconds, 1)

        if ($output) {
            Write-Host ""
            Write-Host "=== Claude Output (Task $taskIndex) ===" -ForegroundColor DarkCyan
            Write-Host $output
            Write-Host "=== End ===" -ForegroundColor DarkCyan
            Write-Host ""
        }

        if ($SaveReports -and $output) {
            $ts = Get-Date -Format "yyyyMMdd-HHmmss"
            $reportFile = Join-Path $ReportDir ("task-{0:D3}-{1}.txt" -f $taskIndex, $ts)
            $reportContent = "# Task $taskIndex / $($tasks.Count)`n"
            $reportContent += "# Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
            $reportContent += "# Elapsed: ${elapsed}s`n`n"
            $reportContent += "## Prompt`n$prompt`n`n"
            $reportContent += "## Output`n$output"
            [System.IO.File]::WriteAllText($reportFile, $reportContent, [System.Text.Encoding]::UTF8)
            Write-Log "Report saved: $reportFile" "INFO"
        }

        if ($exitCode -eq 0) {
            $successCount++
            Write-Log "Task done. Elapsed: ${elapsed}s" "SUCCESS"
        } else {
            $failCount++
            Write-Log "Task failed with exit code: $exitCode. Elapsed: ${elapsed}s" "ERROR"
        }
    } catch {
        $sw.Stop()
        $failCount++
        Write-Log "Exception: $($_.Exception.Message)" "ERROR"
    }

    if ($taskIndex -lt $tasks.Count) {
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Log "==========================================" "HEADER"
Write-Log "Done: $successCount succeeded, $failCount failed, $($tasks.Count) total" "HEADER"
if ($SaveReports) {
    Write-Log "Reports: $ReportDir" "INFO"
}
Write-Log "==========================================" "HEADER"

if ($failCount -gt 0) { exit 1 } else { exit 0 }
