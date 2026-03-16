# CRM Fix Runner - Automated Repair Script
# Usage:
#   .\fix-runner.ps1
#   .\fix-runner.ps1 -StartFrom 3
#   .\fix-runner.ps1 -Only T05,T06 -SaveLogs -Verify
#   .\fix-runner.ps1 -DryRun
#   .\fix-runner.ps1 -Skills "" -Help
#   .\fix-runner.ps1 -Help

param(
    [string]$TaskFile   = ".\fix-tasks.txt",
    [string]$Model      = "claude-opus-4-6",
    [int]$MaxTurns      = 80,
    [int]$StartFrom     = 1,
    [int]$PauseSecs     = 5,
    [string]$Only       = "",
    [switch]$SaveLogs,
    [string]$LogDir     = ".\fix-logs",
    [switch]$Verify,
    [string]$VerifyCmd  = "cd packages/server && pnpm build",
    [switch]$DryRun,
    [switch]$Force,
    [switch]$ShowCmd,
    [string]$Skills     = "coding-standards,backend-patterns",
    [string]$SkillsDir  = "$env:USERPROFILE\.claude\skills",
    [switch]$Help
)

$ErrorActionPreference = "Continue"

if ($Help) {
    Write-Host ""
    Write-Host "CRM Fix Runner" -ForegroundColor Cyan
    Write-Host "==============" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  .\fix-runner.ps1 [-StartFrom N] [-Only 'T05,T06'] [-SaveLogs] [-Verify] [-DryRun] [-Force]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -TaskFile   Task file (default: .\fix-tasks.txt)"
    Write-Host "  -Model      Claude model (default: claude-opus-4-6)"
    Write-Host "  -MaxTurns   Max turns per task (default: 80)"
    Write-Host "  -StartFrom  Resume from task index N (default: 1)"
    Write-Host "  -PauseSecs  Pause between tasks in seconds (default: 5)"
    Write-Host "  -Only       Comma-separated task IDs to run, e.g. T05,T06"
    Write-Host "  -SaveLogs   Save output to -LogDir"
    Write-Host "  -LogDir     Log directory (default: .\fix-logs)"
    Write-Host "  -Verify     Run verification command after all tasks"
    Write-Host "  -VerifyCmd  Verification command (default: cd packages/server && pnpm build)"
    Write-Host "  -DryRun     Print task list without executing"
    Write-Host "  -Force      Allow running on main/master branch"
    Write-Host "  -ShowCmd    Print claude command details"
    Write-Host "  -Skills     Comma-separated skill names to inject (default: coding-standards,backend-patterns)"
    Write-Host "              Pass empty string to disable: -Skills ''"
    Write-Host "  -SkillsDir  Root dir for skills (default: ~/.claude/skills)"
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

# Claude CLI check
if (-not $DryRun) {
    $ver = & claude --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Claude CLI not found. Run: npm install -g @anthropic-ai/claude-code" "ERROR"
        exit 1
    }
    Write-Log "Claude CLI ready: $ver" "SUCCESS"
}

# Git branch check
$isGitRepo = Test-Path ".git"
if ($isGitRepo) {
    $branch = (& git rev-parse --abbrev-ref HEAD 2>&1).Trim()
    Write-Log "Branch: $branch" "INFO"
    if (($branch -eq "main" -or $branch -eq "master") -and (-not $Force)) {
        Write-Log "On protected branch. Use -Force or switch to a feature branch." "ERROR"
        exit 1
    }
}

# Task file check
if (-not (Test-Path $TaskFile)) {
    Write-Log "Task file not found: $TaskFile" "ERROR"
    exit 1
}

# Load skill files and build system-prompt suffix
$systemPromptExtra = ""
if ($Skills -ne "" -and -not $DryRun) {
    $skillNames = $Skills.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    $skillParts = New-Object System.Collections.Generic.List[string]
    foreach ($sName in $skillNames) {
        # Support both flat (skills/coding-standards/SKILL.md) and nested paths
        $candidates = @(
            (Join-Path $SkillsDir "$sName\SKILL.md"),
            (Join-Path $SkillsDir "$sName.md"),
            (Join-Path $SkillsDir "superpowers\skills\$sName\SKILL.md")
        )
        $found = $false
        foreach ($candidate in $candidates) {
            if (Test-Path $candidate) {
                $rawSkill = Get-Content -Path $candidate -Encoding UTF8 -Raw
                # Strip YAML frontmatter (--- ... ---)
                $rawSkill = $rawSkill -replace '(?s)^---.*?---\s*', ''
                $skillParts.Add($rawSkill.Trim())
                Write-Log ("Skill loaded: {0}" -f $sName) "INFO"
                $found = $true
                break
            }
        }
        if (-not $found) {
            Write-Log ("Skill not found: {0} (searched in {1})" -f $sName, $SkillsDir) "WARN"
        }
    }
    if ($skillParts.Count -gt 0) {
        $systemPromptExtra = $skillParts -join "`n`n---`n`n"
        Write-Log ("{0} skill(s) loaded, system prompt: {1} chars" -f $skillParts.Count, $systemPromptExtra.Length) "INFO"
    }
}

# Parse tasks - blank-line-separated blocks, lines matching "# TXX" start a new task
$rawLines = Get-Content -Path $TaskFile -Encoding UTF8
$tasks = New-Object System.Collections.Generic.List[hashtable]
$currentLines = New-Object System.Collections.Generic.List[string]
$currentId = ""

foreach ($line in $rawLines) {
    if ($line -match '^# (T\d+) ') {
        if ($currentLines.Count -gt 0 -and $currentId -ne "") {
            $body = ($currentLines -join "`n").Trim()
            $tasks.Add(@{ Id = $currentId; Body = $body })
            $currentLines.Clear()
        }
        $currentId = $Matches[1]
        continue
    }
    # Skip comment/blank lines before the first task header
    if ($currentId -eq "") { continue }
    if ($line -match '^#') { continue }
    $currentLines.Add($line)
}
if ($currentLines.Count -gt 0 -and $currentId -ne "") {
    $body = ($currentLines -join "`n").Trim()
    $tasks.Add(@{ Id = $currentId; Body = $body })
}

if ($tasks.Count -eq 0) {
    Write-Log "No tasks found in: $TaskFile" "ERROR"
    exit 1
}

# Build Only filter set
$onlySet = New-Object System.Collections.Generic.HashSet[string]
if ($Only -ne "") {
    foreach ($id in $Only.Split(',')) {
        $onlySet.Add($id.Trim().ToUpper()) | Out-Null
    }
}

# Dry run mode
if ($DryRun) {
    $taskCount = $tasks.Count
    Write-Log "DRY RUN - $taskCount tasks:" "HEADER"
    $seq = 0
    foreach ($t in $tasks) {
        $seq++
        $shouldSkip = ($onlySet.Count -gt 0 -and -not $onlySet.Contains($t.Id.ToUpper()))
        $flag = if ($shouldSkip) { "SKIP" } else { "RUN " }
        $preview = $t.Body -replace '^\s+', ''
        if ($preview.Length -gt 80) { $preview = $preview.Substring(0, 80) + "..." }
        $color = if ($shouldSkip) { "DarkGray" } else { "White" }
        Write-Host ("  [{0}] {1} ({2}) - {3}" -f $flag, $t.Id, $seq, $preview) -ForegroundColor $color
    }
    exit 0
}

# Prepare log dir
if ($SaveLogs) {
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir | Out-Null
        Write-Log "Log dir: $LogDir" "INFO"
    }
    $sessionFile = Join-Path $LogDir ("session-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")
    $taskCountStr = $tasks.Count.ToString()
    [System.IO.File]::WriteAllText($sessionFile, ("Session: {0}`nModel: {1}`nSkills: {2}`nTasks: {3}`n" -f (Get-Date), $Model, $Skills, $taskCountStr), [System.Text.Encoding]::UTF8)
    Write-Log "Session log: $sessionFile" "INFO"
}

$successCount = 0
$failCount = 0
$skipCount = 0
$startTime = Get-Date
$taskSeq = 0

foreach ($t in $tasks) {
    $taskSeq++

    if ($taskSeq -lt $StartFrom) {
        $skipCount++
        continue
    }

    if ($onlySet.Count -gt 0 -and -not $onlySet.Contains($t.Id.ToUpper())) {
        $skipCount++
        Write-Log "Skip $($t.Id) (not in -Only list)" "DEBUG"
        continue
    }

    $prompt = $t.Body.Trim()
    $preview = $prompt -replace '^\s+', ''
    if ($preview.Length -gt 120) { $preview = $preview.Substring(0, 120) + "..." }

    Write-Host ""
    $taskTotal = $tasks.Count.ToString()
    Write-Log ("--- [{0}] {1}/{2} ---" -f $t.Id, $taskSeq, $taskTotal) "HEADER"
    Write-Log $preview "INFO"

    if ($ShowCmd) {
        $skillFlag = if ($systemPromptExtra -ne "") { " --append-system-prompt <skills>" } else { "" }
        Write-Log ("CMD: echo prompt | claude --model {0} --print --dangerously-skip-permissions --output-format text --max-turns {1}{2}" -f $Model, $MaxTurns, $skillFlag) "DEBUG"
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $exitCode = -1

    try {
        Write-Host ""
        Write-Host ("=== Output [{0}] ===" -f $t.Id) -ForegroundColor DarkCyan

        $outputLines = New-Object System.Collections.Generic.List[string]
        if ($systemPromptExtra -ne "") {
            $prompt | & claude --model $Model --print --dangerously-skip-permissions --output-format text --max-turns $MaxTurns --append-system-prompt $systemPromptExtra 2>&1 | ForEach-Object {
                Write-Host $_
                $outputLines.Add([string]$_)
            }
        } else {
            $prompt | & claude --model $Model --print --dangerously-skip-permissions --output-format text --max-turns $MaxTurns 2>&1 | ForEach-Object {
                Write-Host $_
                $outputLines.Add([string]$_)
            }
        }

        $exitCode = $LASTEXITCODE
        $sw.Stop()
        $elapsedSec = [Math]::Round($sw.Elapsed.TotalSeconds, 1)
        $output = $outputLines -join "`n"

        Write-Host ("=== End [{0}] {1}s ===" -f $t.Id, $elapsedSec) -ForegroundColor DarkCyan
        Write-Host ""

        if ($SaveLogs -and $output) {
            $logTs = Get-Date -Format "yyyyMMdd-HHmmss"
            $logFile = Join-Path $LogDir ($t.Id + "-" + $logTs + ".txt")
            $logContent = ("# {0} | {1} | {2}s`n`n## Prompt`n{3}`n`n## Output`n{4}" -f $t.Id, (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $elapsedSec, $prompt, $output)
            [System.IO.File]::WriteAllText($logFile, $logContent, [System.Text.Encoding]::UTF8)
            Write-Log "Log: $logFile" "INFO"
        }

        if ($isGitRepo) {
            $changed = & git status --short 2>&1
            $changedCount = ($changed | Measure-Object).Count
            if ($changedCount -gt 0) {
                Write-Log "Files changed: $changedCount" "INFO"
                if ($ShowCmd) { $changed | ForEach-Object { Write-Log "  $_" "DEBUG" } }
            } else {
                Write-Log "No changes detected." "WARN"
            }
        }

        if ($exitCode -eq 0) {
            $successCount++
            Write-Log ("{0} done. {1}s" -f $t.Id, $elapsedSec) "SUCCESS"
        } else {
            $failCount++
            Write-Log ("{0} failed. ExitCode={1}. {2}s" -f $t.Id, $exitCode, $elapsedSec) "ERROR"
        }
    } catch {
        $sw.Stop()
        $failCount++
        Write-Log ("{0} exception: {1}" -f $t.Id, $_.Exception.Message) "ERROR"
    }

    if ($taskSeq -lt $tasks.Count) {
        Write-Log ("Pause {0}s..." -f $PauseSecs) "DEBUG"
        Start-Sleep -Seconds $PauseSecs
    }
}

$totalMin = [Math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)

Write-Host ""
Write-Log "==========================================" "HEADER"
Write-Log ("Done: {0} ok / {1} failed / {2} skipped" -f $successCount, $failCount, $skipCount) "HEADER"
Write-Log ("Total: {0} min" -f $totalMin) "INFO"
if ($SaveLogs) { Write-Log "Logs: $LogDir" "INFO" }
Write-Log "==========================================" "HEADER"

if ($Verify -and $failCount -eq 0) {
    Write-Host ""
    Write-Log "Verification: $VerifyCmd" "HEADER"
    try {
        Invoke-Expression $VerifyCmd
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Verification PASSED." "SUCCESS"
        } else {
            Write-Log ("Verification FAILED. ExitCode={0}" -f $LASTEXITCODE) "ERROR"
            exit 1
        }
    } catch {
        Write-Log ("Verification exception: {0}" -f $_.Exception.Message) "ERROR"
        exit 1
    }
} elseif ($Verify -and $failCount -gt 0) {
    Write-Log "Skipping verification - $failCount task(s) failed." "WARN"
}

if ($failCount -gt 0) { exit 1 } else { exit 0 }
