# Claude Code Automated Development Script — CRM Sales Platform
# Usage:
#   .\scripts\claude-dev.ps1
#   .\scripts\claude-dev.ps1 -StartFrom 3
#   .\scripts\claude-dev.ps1 -SaveLogs -MaxTurns 80
#   .\scripts\claude-dev.ps1 -Verify
#   .\scripts\claude-dev.ps1 -Help

param(
    [string]$TaskFile  = ".\claude-tasks.txt",
    [string]$Model     = "claude-opus-4-5",
    [int]$MaxTurns     = 60,
    [int]$StartFrom    = 1,
    [int]$PauseSecs    = 3,
    [switch]$SaveLogs,
    [string]$LogDir    = ".\dev-logs",
    [switch]$Verify,
    [string]$VerifyCmd = "pnpm lint && pnpm test",
    [switch]$Force,
    [switch]$ShowCmd,
    [switch]$Help
)

$ErrorActionPreference = "Continue"

if ($Help) {
    Write-Host ""
    Write-Host "Claude Code Automated Development Script — CRM Sales Platform" -ForegroundColor Cyan
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\claude-dev.ps1 [-TaskFile path] [-Model name] [-MaxTurns N] [-StartFrom N]"
    Write-Host "                           [-PauseSecs N] [-SaveLogs] [-Verify] [-VerifyCmd cmd] [-Force] [-ShowCmd]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -TaskFile    Task file path          (default: .\claude-tasks.txt)"
    Write-Host "  -Model       Claude model ID         (default: claude-opus-4-5)"
    Write-Host "  -MaxTurns    Max turns per task      (default: 60)"
    Write-Host "  -StartFrom   Resume from task N      (default: 1)"
    Write-Host "  -PauseSecs   Pause between tasks     (default: 3)"
    Write-Host "  -SaveLogs    Save each task log to -LogDir"
    Write-Host "  -LogDir      Log output directory    (default: .\dev-logs)"
    Write-Host "  -Verify      Run verify command after all tasks complete"
    Write-Host "  -VerifyCmd   Verify command string   (default: pnpm lint && pnpm test)"
    Write-Host "  -Force       Allow running on main/master branch"
    Write-Host "  -ShowCmd     Print claude command + git diff summary"
    Write-Host "  -Help        Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\claude-dev.ps1"
    Write-Host "  .\scripts\claude-dev.ps1 -StartFrom 5 -SaveLogs"
    Write-Host "  .\scripts\claude-dev.ps1 -Verify -VerifyCmd 'pnpm test'"
    Write-Host "  .\scripts\claude-dev.ps1 -MaxTurns 80 -PauseSecs 5 -SaveLogs -Verify"
    Write-Host "  .\scripts\claude-dev.ps1 -Model claude-sonnet-4-5 -MaxTurns 40"
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

# -------------------------------------------------------
# 1. Verify claude CLI is available
# -------------------------------------------------------
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

# -------------------------------------------------------
# 2. Git branch safety check
# -------------------------------------------------------
$isGitRepo = Test-Path ".git"
if ($isGitRepo) {
    $branch = (& git rev-parse --abbrev-ref HEAD 2>&1).Trim()
    Write-Log "Current branch: $branch" "INFO"
    if ($branch -eq "main" -or $branch -eq "master") {
        Write-Log "WARNING: You are on the '$branch' branch." "WARN"
        if (-not $Force) {
            Write-Log "Development tasks will modify files. Switch to a feature branch or use -Force to proceed." "ERROR"
            exit 1
        }
        Write-Log "Proceeding on '$branch' branch (Force mode)." "WARN"
    }
} else {
    Write-Log "Not a git repository -- skipping branch check." "WARN"
}

# -------------------------------------------------------
# 3. Load and parse task file
# -------------------------------------------------------
if (-not (Test-Path $TaskFile)) {
    Write-Log "Task file not found: $TaskFile" "ERROR"
    Write-Log "Create claude-tasks.txt with tasks separated by blank lines." "INFO"
    exit 1
}

# Parse: blank-line separated blocks, lines starting with # are comments
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
Write-Log "Model: $Model | MaxTurns: $MaxTurns | PauseSecs: $PauseSecs" "INFO"

# -------------------------------------------------------
# 4. Prepare log directory
# -------------------------------------------------------
if ($SaveLogs) {
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir | Out-Null
        Write-Log "Created log dir: $LogDir" "INFO"
    }
    $sessionLog = Join-Path $LogDir ("session-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
    $sessionHeader = "CRM Sales Platform — Claude Dev Session`n"
    $sessionHeader += "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
    $sessionHeader += "Model: $Model | MaxTurns: $MaxTurns | Tasks: $($tasks.Count) | StartFrom: $StartFrom`n"
    $sessionHeader += "Branch: $branch`n"
    [System.IO.File]::WriteAllText($sessionLog, $sessionHeader, [System.Text.Encoding]::UTF8)
    Write-Log "Session log: $sessionLog" "INFO"
}

# -------------------------------------------------------
# 5. Run tasks
# -------------------------------------------------------
$successCount = 0
$failCount    = 0
$startTime    = Get-Date

for ($i = 0; $i -lt $tasks.Count; $i++) {
    $taskIndex = $i + 1
    if ($taskIndex -lt $StartFrom) { continue }

    $prompt = $tasks[$i].Trim()
    $short  = if ($prompt.Length -gt 120) { $prompt.Substring(0, 120) + "..." } else { $prompt }

    Write-Host ""
    Write-Log "--- Task [$taskIndex/$($tasks.Count)] ---" "HEADER"
    Write-Log $short "INFO"

    if ($ShowCmd) {
        Write-Log "CMD: (prompt) | claude --model $Model --print --dangerously-skip-permissions --output-format text --max-turns $MaxTurns" "DEBUG"
    }

    # Show git status before task
    if ($isGitRepo -and $ShowCmd) {
        $gitBefore = & git status --short 2>&1
        if ($gitBefore) {
            Write-Log "Git status before task: $($gitBefore.Count) changed file(s)" "DEBUG"
        }
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        Write-Host ""
        Write-Host "=== Claude Output (Task $taskIndex/$($tasks.Count)) ===" -ForegroundColor DarkCyan

        # Stream output line-by-line in real-time AND capture for log saving
        $outputLines = [System.Collections.Generic.List[string]]::new()
        $prompt | & claude `
            --model $Model `
            --print `
            --dangerously-skip-permissions `
            --output-format text `
            --max-turns $MaxTurns `
            2>&1 | ForEach-Object {
                Write-Host $_
                $outputLines.Add($_)
            }

        $exitCode = $LASTEXITCODE
        $sw.Stop()
        $elapsed = [Math]::Round($sw.Elapsed.TotalSeconds, 1)
        $output  = $outputLines -join "`n"

        Write-Host "=== End Task $taskIndex (${elapsed}s, exit=$exitCode) ===" -ForegroundColor DarkCyan
        Write-Host ""

        # Save task log
        if ($SaveLogs -and $output) {
            $ts = Get-Date -Format "yyyyMMdd-HHmmss"
            $logFile = Join-Path $LogDir ("task-{0:D3}-{1}.txt" -f $taskIndex, $ts)
            $logContent = "# Task $taskIndex / $($tasks.Count)`n"
            $logContent += "# Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
            $logContent += "# Elapsed: ${elapsed}s  ExitCode: $exitCode`n`n"
            $logContent += "## Prompt`n$prompt`n`n"
            $logContent += "## Output`n$output"
            [System.IO.File]::WriteAllText($logFile, $logContent, [System.Text.Encoding]::UTF8)
            Write-Log "Log saved: $logFile" "INFO"
        }

        # Show git diff summary after task
        if ($isGitRepo) {
            $changed = & git status --short 2>&1
            if ($changed) {
                Write-Log "Files changed after task: $($changed.Count) file(s)" "INFO"
                if ($ShowCmd) {
                    $changed | ForEach-Object { Write-Log "  $_" "DEBUG" }
                }
            } else {
                Write-Log "No file changes detected after task." "WARN"
            }
        }

        if ($exitCode -eq 0) {
            $successCount++
            Write-Log "Task $taskIndex done. Elapsed: ${elapsed}s" "SUCCESS"
        } else {
            $failCount++
            Write-Log "Task $taskIndex failed (exit code: $exitCode). Elapsed: ${elapsed}s" "ERROR"
        }

    } catch {
        $sw.Stop()
        $failCount++
        Write-Log "Task $taskIndex exception: $($_.Exception.Message)" "ERROR"
    }

    # Pause between tasks (skip after last)
    if ($taskIndex -lt $tasks.Count) {
        Write-Log "Pausing ${PauseSecs}s before next task..." "DEBUG"
        Start-Sleep -Seconds $PauseSecs
    }
}

# -------------------------------------------------------
# 6. Summary
# -------------------------------------------------------
$totalElapsed = [Math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)

Write-Host ""
Write-Log "==========================================" "HEADER"
Write-Log "Done: $successCount succeeded, $failCount failed, $($tasks.Count) total" "HEADER"
Write-Log "Total time: ${totalElapsed} minutes" "INFO"
if ($SaveLogs) { Write-Log "Logs saved to: $LogDir" "INFO" }
Write-Log "==========================================" "HEADER"

# -------------------------------------------------------
# 7. Optional build/test verification
# -------------------------------------------------------
if ($Verify -and $failCount -eq 0) {
    Write-Host ""
    Write-Log "Running verification: $VerifyCmd" "HEADER"
    try {
        Invoke-Expression $VerifyCmd
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Verification passed." "SUCCESS"
        } else {
            Write-Log "Verification FAILED (exit code: $LASTEXITCODE)" "ERROR"
            exit 1
        }
    } catch {
        Write-Log "Verification exception: $($_.Exception.Message)" "ERROR"
        exit 1
    }
} elseif ($Verify -and $failCount -gt 0) {
    Write-Log "Skipping verification -- $failCount task(s) failed." "WARN"
}

if ($failCount -gt 0) { exit 1 } else { exit 0 }
