# CRM APP Dev Runner - Automated APP Development Script
# Usage:
#   .\app-dev.ps1
#   .\app-dev.ps1 -Phase 1
#   .\app-dev.ps1 -Phase A,C
#   .\app-dev.ps1 -Only A1,B8 -SaveLogs
#   .\app-dev.ps1 -DryRun
#   .\app-dev.ps1 -Help

param(
    [string]$TaskFile   = ".\app-tasks.txt",
    [string]$Model      = "claude-sonnet-4-6",
    [int]$MaxTurns      = 80,
    [int]$StartFrom     = 1,
    [int]$PauseSecs     = 5,
    [string]$Only       = "",
    [string]$Phase      = "",
    [switch]$SaveLogs,
    [string]$LogDir     = ".\app-logs",
    [switch]$Verify,
    [string]$VerifyCmd  = "cd packages/miniapp && pnpm build:mp-weixin",
    [switch]$DryRun,
    [switch]$Force,
    [switch]$ShowCmd,
    [string]$Skills     = "coding-standards,frontend-patterns",
    [string]$SkillsDir  = "$env:USERPROFILE\.claude\skills",
    [switch]$Help
)

$ErrorActionPreference = "Continue"

# Phase-to-task mapping
$PhaseMap = @{
    "1" = "A1,A3,B8,B1,B2,B3,B4,C1,C2,C3,C5,B5,B7"
    "2" = "C4,C6,E1,E2,E3,B6"
    "3" = "D1,D2,D4,F1,F2,A2,G1"
    "4" = "D3,E4,E5,F3,A4,A5,G2,G3,G4"
}

if ($Help) {
    Write-Host ""
    Write-Host "CRM APP Dev Runner" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  .\app-dev.ps1 [-Phase 1|2|3|4|A|B|...] [-Only 'A1,B2'] [-StartFrom N] [-SaveLogs] [-Verify] [-DryRun]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -TaskFile   Task file (default: .\app-tasks.txt)"
    Write-Host "  -Model      Claude model (default: claude-sonnet-4-6)"
    Write-Host "  -MaxTurns   Max turns per task (default: 80)"
    Write-Host "  -Phase      Phase filter: 1/2/3/4 (dev order) or A/B/C/D/E/F/G (prefix)"
    Write-Host "              Examples: -Phase 1, -Phase A, -Phase A,C"
    Write-Host "  -StartFrom  Resume from task index N (default: 1)"
    Write-Host "  -PauseSecs  Pause between tasks in seconds (default: 5)"
    Write-Host "  -Only       Comma-separated task IDs to run, e.g. A1,B2"
    Write-Host "  -SaveLogs   Save output to -LogDir"
    Write-Host "  -LogDir     Log directory (default: .\app-logs)"
    Write-Host "  -Verify     Run verification command after all tasks"
    Write-Host "  -VerifyCmd  Verification command (default: cd packages/miniapp && pnpm build:mp-weixin)"
    Write-Host "  -DryRun     Print task list without executing"
    Write-Host "  -Force      Allow running on main/master branch"
    Write-Host "  -ShowCmd    Print claude command details"
    Write-Host "  -Skills     Comma-separated skill names (default: coding-standards,frontend-patterns)"
    Write-Host "              Pass empty string to disable: -Skills ''"
    Write-Host "  -SkillsDir  Root dir for skills (default: ~/.claude/skills)"
    Write-Host ""
    Write-Host "Phases:" -ForegroundColor Yellow
    Write-Host "  1 (MVP):    A1,A3,B8,B1,B2,B3,B4,C1,C2,C3,C5,B5,B7"
    Write-Host "  2 (通话):   C4,C6,E1,E2,E3,B6"
    Write-Host "  3 (补齐):   D1,D2,D4,F1,F2,A2,G1"
    Write-Host "  4 (增强):   D3,E4,E5,F3,A4,A5,G2,G3,G4"
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

# Resolve -Phase to -Only (Phase takes precedence if both set)
if ($Phase -ne "") {
    $phaseIds = New-Object System.Collections.Generic.List[string]
    foreach ($p in $Phase.Split(',')) {
        $p = $p.Trim().ToUpper()
        if ($PhaseMap.ContainsKey($p)) {
            # Numeric phase → mapped task IDs
            $phaseIds.AddRange($PhaseMap[$p].Split(','))
        } else {
            # Letter prefix → will be matched during filtering
            $phaseIds.Add("PREFIX:$p")
        }
    }
    # If Only was also set, merge; otherwise replace
    if ($Only -ne "") {
        $Only = $Only + "," + ($phaseIds -join ",")
    } else {
        $Only = $phaseIds -join ","
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
        $candidates = @(
            (Join-Path $SkillsDir "$sName\SKILL.md"),
            (Join-Path $SkillsDir "$sName.md"),
            (Join-Path $SkillsDir "superpowers\skills\$sName\SKILL.md")
        )
        $found = $false
        foreach ($candidate in $candidates) {
            if (Test-Path $candidate) {
                $rawSkill = Get-Content -Path $candidate -Encoding UTF8 -Raw
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

# Parse tasks - lines matching "# XX " start a new task (A1, B2, etc.)
$rawLines = Get-Content -Path $TaskFile -Encoding UTF8
$tasks = New-Object System.Collections.Generic.List[hashtable]
$currentLines = New-Object System.Collections.Generic.List[string]
$currentId = ""

foreach ($line in $rawLines) {
    if ($line -match '^# ([A-G]\d+) ') {
        if ($currentLines.Count -gt 0 -and $currentId -ne "") {
            $body = ($currentLines -join "`n").Trim()
            $tasks.Add(@{ Id = $currentId; Body = $body })
            $currentLines.Clear()
        }
        $currentId = $Matches[1]
        continue
    }
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

# Build Only filter set (supports PREFIX: entries for letter-based Phase filtering)
$onlySet = New-Object System.Collections.Generic.HashSet[string]
$prefixSet = New-Object System.Collections.Generic.HashSet[string]
if ($Only -ne "") {
    foreach ($id in $Only.Split(',')) {
        $id = $id.Trim().ToUpper()
        if ($id.StartsWith("PREFIX:")) {
            $prefixSet.Add($id.Substring(7)) | Out-Null
        } else {
            $onlySet.Add($id) | Out-Null
        }
    }
}

function Test-TaskMatch {
    param([string]$TaskId)
    if ($onlySet.Count -eq 0 -and $prefixSet.Count -eq 0) { return $true }
    $upper = $TaskId.ToUpper()
    if ($onlySet.Contains($upper)) { return $true }
    foreach ($pfx in $prefixSet) {
        if ($upper.StartsWith($pfx)) { return $true }
    }
    return $false
}

# Dry run mode
if ($DryRun) {
    $taskCount = $tasks.Count
    $runCount = 0
    Write-Log "DRY RUN - $taskCount tasks:" "HEADER"
    $seq = 0
    foreach ($t in $tasks) {
        $seq++
        $shouldRun = Test-TaskMatch $t.Id
        $flag = if ($shouldRun) { "RUN " } else { "SKIP" }
        if ($shouldRun) { $runCount++ }
        $preview = $t.Body -replace '^\s+', ''
        if ($preview.Length -gt 80) { $preview = $preview.Substring(0, 80) + "..." }
        $color = if (-not $shouldRun) { "DarkGray" } else { "White" }
        Write-Host ("  [{0}] {1} ({2}) - {3}" -f $flag, $t.Id, $seq, $preview) -ForegroundColor $color
    }
    Write-Host ""
    Write-Log "$runCount task(s) to run out of $taskCount total" "INFO"
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
    [System.IO.File]::WriteAllText($sessionFile, ("Session: {0}`nModel: {1}`nSkills: {2}`nTasks: {3}`nPhase: {4}`n" -f (Get-Date), $Model, $Skills, $taskCountStr, $Phase), [System.Text.Encoding]::UTF8)
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

    if (-not (Test-TaskMatch $t.Id)) {
        $skipCount++
        Write-Log "Skip $($t.Id) (filtered out)" "DEBUG"
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
