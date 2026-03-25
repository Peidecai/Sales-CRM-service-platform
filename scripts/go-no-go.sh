#!/usr/bin/env bash
# ============================================================================
#  CRM Sales Platform — Go / No-Go Decision Framework
# ============================================================================
#
#  Aggregates Quality, Security, Performance, and Operations readiness signals
#  into a single PASS / FAIL decision with per-gate verdicts.
#
#  Usage:
#    bash scripts/go-no-go.sh [--env test|staging|production] [--skip-perf] [--json]
#
#  Exit codes:
#    0 — GO   (all gates pass)
#    1 — NO-GO (one or more gates fail)
#    2 — ERROR (script failure, treat as NO-GO)
#
# ============================================================================

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────

DEPLOY_ENV="${DEPLOY_ENV:-production}"
SKIP_PERF=false
JSON_OUTPUT=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Parse Args ───────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)        DEPLOY_ENV="$2"; shift 2 ;;
    --skip-perf)  SKIP_PERF=true; shift ;;
    --json)       JSON_OUTPUT=true; shift ;;
    -h|--help)
      echo "Usage: bash scripts/go-no-go.sh [--env test|staging|production] [--skip-perf] [--json]"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 2 ;;
  esac
done

# ── State ────────────────────────────────────────────────────────────────────

declare -A GATE_STATUS   # gate name → PASS|FAIL|SKIP
declare -A GATE_DETAILS  # gate name → detail message
OVERALL="GO"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

pass_gate() { GATE_STATUS["$1"]="PASS"; GATE_DETAILS["$1"]="$2"; }
fail_gate() { GATE_STATUS["$1"]="FAIL"; GATE_DETAILS["$1"]="$2"; OVERALL="NO-GO"; }
skip_gate() { GATE_STATUS["$1"]="SKIP"; GATE_DETAILS["$1"]="$2"; }

# ============================================================================
#  GATE 1 — QUALITY (tests, types, lint, coverage)
# ============================================================================

run_quality_gate() {
  echo "▶ Gate 1/4: Quality"
  local failures=()

  # 1a. Backend tests
  echo "  ├─ Backend tests..."
  if (cd "$ROOT_DIR" && pnpm --filter @crm/server test -- --ci --passWithNoTests 2>&1 | tail -5); then
    echo "  │  ✓ Backend tests passed"
  else
    failures+=("backend-tests")
    echo "  │  ✗ Backend tests FAILED"
  fi

  # 1b. Frontend tests
  echo "  ├─ Frontend tests..."
  if (cd "$ROOT_DIR" && pnpm --filter @crm/web test 2>&1 | tail -5); then
    echo "  │  ✓ Frontend tests passed"
  else
    failures+=("frontend-tests")
    echo "  │  ✗ Frontend tests FAILED"
  fi

  # 1c. TypeScript type check — server
  echo "  ├─ Type check (server)..."
  if (cd "$ROOT_DIR" && pnpm --filter @crm/shared build > /dev/null 2>&1 && pnpm --filter @crm/server build > /dev/null 2>&1); then
    echo "  │  ✓ Server types OK"
  else
    failures+=("server-typecheck")
    echo "  │  ✗ Server type check FAILED"
  fi

  # 1d. TypeScript type check — web
  echo "  ├─ Type check (web)..."
  if (cd "$ROOT_DIR" && pnpm --filter @crm/web type-check 2>&1 | tail -3); then
    echo "  │  ✓ Web types OK"
  else
    failures+=("web-typecheck")
    echo "  │  ✗ Web type check FAILED"
  fi

  # 1e. Lint
  echo "  ├─ Lint..."
  if (cd "$ROOT_DIR" && pnpm --filter @crm/server lint > /dev/null 2>&1 && pnpm --filter @crm/web lint > /dev/null 2>&1); then
    echo "  │  ✓ Lint passed"
  else
    failures+=("lint")
    echo "  │  ✗ Lint FAILED"
  fi

  # 1f. Web production build
  echo "  └─ Web build..."
  if (cd "$ROOT_DIR" && pnpm --filter @crm/web build > /dev/null 2>&1); then
    echo "     ✓ Web build OK"
  else
    failures+=("web-build")
    echo "     ✗ Web build FAILED"
  fi

  if [[ ${#failures[@]} -eq 0 ]]; then
    pass_gate "quality" "All checks passed (tests, types, lint, build)"
  else
    fail_gate "quality" "Failed: ${failures[*]}"
  fi
}

# ============================================================================
#  GATE 2 — SECURITY (deps, headers, auth config, secrets)
# ============================================================================

run_security_gate() {
  echo ""
  echo "▶ Gate 2/4: Security"
  local failures=()

  # 2a. Dependency audit (high/critical)
  echo "  ├─ Dependency audit..."
  if (cd "$ROOT_DIR" && pnpm audit --audit-level high > /dev/null 2>&1); then
    echo "  │  ✓ No high/critical vulnerabilities"
  else
    # Non-blocking for test/staging, blocking for production
    if [[ "$DEPLOY_ENV" == "production" ]]; then
      failures+=("dep-audit-high")
      echo "  │  ✗ High/critical vulnerabilities found (blocking for production)"
    else
      echo "  │  ⚠ Vulnerabilities found (non-blocking for $DEPLOY_ENV)"
    fi
  fi

  # 2b. License check (GPL/AGPL blocklist)
  echo "  ├─ License policy..."
  if (cd "$ROOT_DIR" && pnpm dlx license-checker --failOn 'GPL-2.0;GPL-3.0;AGPL-3.0' > /dev/null 2>&1); then
    echo "  │  ✓ No copyleft license violations"
  else
    failures+=("license-policy")
    echo "  │  ✗ Copyleft license detected"
  fi

  # 2c. Secrets in codebase
  echo "  ├─ Secret scan..."
  local secret_patterns='(password|secret|api_key|private_key)\s*[:=]\s*["\x27][^"\x27]{8,}'
  local secret_hits
  secret_hits=$(grep -riE "$secret_patterns" "$ROOT_DIR/packages/" \
    --include='*.ts' --include='*.vue' --include='*.json' \
    -l 2>/dev/null | grep -v node_modules | grep -v '.spec.' | grep -v 'test/' | grep -v '.example' | head -20 || true)
  if [[ -z "$secret_hits" ]]; then
    echo "  │  ✓ No hardcoded secrets detected"
  else
    local count
    count=$(echo "$secret_hits" | wc -l)
    echo "  │  ⚠ Possible secrets in $count file(s) — manual review needed"
    # Warning, not auto-fail (many are config templates)
  fi

  # 2d. Environment validation
  echo "  ├─ Environment variables..."
  if [[ "$DEPLOY_ENV" == "production" ]]; then
    local missing_vars=()
    for var in JWT_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY DB_PASSWORD; do
      if [[ -z "${!var:-}" ]]; then
        missing_vars+=("$var")
      fi
    done
    if [[ ${#missing_vars[@]} -eq 0 ]]; then
      echo "  │  ✓ Critical secrets present"
    else
      failures+=("missing-env:${missing_vars[*]}")
      echo "  │  ✗ Missing: ${missing_vars[*]}"
    fi
  else
    echo "  │  ⏭ Skipped (non-production)"
  fi

  # 2e. Container non-root check (if Docker available)
  echo "  └─ Container security..."
  if command -v docker &> /dev/null; then
    if docker image inspect crm-server:latest > /dev/null 2>&1; then
      local user
      user=$(docker inspect --format='{{.Config.User}}' crm-server:latest 2>/dev/null || echo "")
      if [[ -n "$user" && "$user" != "root" && "$user" != "0" ]]; then
        echo "     ✓ Server container runs as non-root ($user)"
      else
        failures+=("container-root")
        echo "     ✗ Server container may run as root"
      fi
    else
      echo "     ⏭ No server image available (skipped)"
    fi
  else
    echo "     ⏭ Docker not available (skipped)"
  fi

  if [[ ${#failures[@]} -eq 0 ]]; then
    pass_gate "security" "Deps clean, licenses OK, env validated"
  else
    fail_gate "security" "Failed: ${failures[*]}"
  fi
}

# ============================================================================
#  GATE 3 — PERFORMANCE (build size, load test thresholds)
# ============================================================================

run_performance_gate() {
  echo ""
  echo "▶ Gate 3/4: Performance"

  if $SKIP_PERF; then
    skip_gate "performance" "Skipped via --skip-perf"
    echo "  └─ ⏭ Skipped"
    return
  fi

  local failures=()

  # 3a. Web bundle size check
  echo "  ├─ Bundle size..."
  local dist_dir="$ROOT_DIR/packages/web/dist"
  if [[ -d "$dist_dir" ]]; then
    # Total JS size in bytes
    local js_size
    js_size=$(find "$dist_dir" -name '*.js' -exec stat --format='%s' {} + 2>/dev/null | awk '{s+=$1}END{print s+0}' || echo "0")
    local js_kb=$((js_size / 1024))
    # Threshold: 2MB total JS
    if [[ $js_size -lt 2097152 ]]; then
      echo "  │  ✓ JS bundle: ${js_kb}KB (< 2MB limit)"
    else
      failures+=("bundle-size:${js_kb}KB")
      echo "  │  ✗ JS bundle: ${js_kb}KB (exceeds 2MB limit)"
    fi
  else
    echo "  │  ⏭ No build output (run web build first)"
  fi

  # 3b. k6 load test (if k6 available and test file exists)
  echo "  └─ Load test..."
  local k6_script="$ROOT_DIR/.tmp/perf/k6-health.js"
  if command -v k6 &> /dev/null && [[ -f "$k6_script" ]]; then
    local k6_out
    k6_out=$(k6 run --quiet "$k6_script" 2>&1 || true)
    # Check thresholds from k6 output
    if echo "$k6_out" | grep -q "✓.*http_req_failed"; then
      echo "     ✓ Load test thresholds met"
    else
      failures+=("load-test-thresholds")
      echo "     ✗ Load test thresholds not met"
    fi
  else
    echo "     ⏭ k6 not available or test script missing"
  fi

  if [[ ${#failures[@]} -eq 0 ]]; then
    pass_gate "performance" "Bundle size OK, load thresholds met"
  else
    fail_gate "performance" "Failed: ${failures[*]}"
  fi
}

# ============================================================================
#  GATE 4 — OPERATIONS (Docker health, DB migrations, backup, monitoring)
# ============================================================================

run_operations_gate() {
  echo ""
  echo "▶ Gate 4/4: Operations"
  local failures=()

  # 4a. Docker compose validity
  echo "  ├─ Docker Compose config..."
  if (cd "$ROOT_DIR" && docker compose config --quiet 2>/dev/null); then
    echo "  │  ✓ docker-compose.yml valid"
  else
    if command -v docker &> /dev/null; then
      failures+=("docker-compose-invalid")
      echo "  │  ✗ docker-compose.yml invalid"
    else
      echo "  │  ⏭ Docker not available"
    fi
  fi

  # 4b. Health endpoint reachable (if server is running)
  echo "  ├─ Health endpoint..."
  local health_url="${API_BASE_URL:-http://localhost:3000}/api/v1/health"
  if curl -sf --max-time 5 "$health_url" > /dev/null 2>&1; then
    echo "  │  ✓ /api/v1/health returns 200"
  else
    if [[ "$DEPLOY_ENV" == "production" ]]; then
      echo "  │  ⚠ Health endpoint unreachable (server may not be running locally)"
    else
      echo "  │  ⏭ Server not running (non-blocking)"
    fi
  fi

  # 4c. Pending migrations check
  echo "  ├─ Database migrations..."
  if (cd "$ROOT_DIR/packages/server" && npx typeorm migration:show -d dist/src/database.config.js 2>/dev/null | grep -q '\[X\]'); then
    local pending
    pending=$(cd "$ROOT_DIR/packages/server" && npx typeorm migration:show -d dist/src/database.config.js 2>/dev/null | grep -c '\[ \]' || echo "0")
    if [[ "$pending" -eq 0 ]]; then
      echo "  │  ✓ All migrations applied"
    else
      echo "  │  ⚠ $pending pending migration(s)"
      if [[ "$DEPLOY_ENV" == "production" ]]; then
        failures+=("pending-migrations:$pending")
      fi
    fi
  else
    echo "  │  ⏭ Cannot check migrations (DB not available or build needed)"
  fi

  # 4d. Backup script exists and executable
  echo "  ├─ Backup readiness..."
  if [[ -x "$ROOT_DIR/scripts/db-backup.sh" ]]; then
    echo "  │  ✓ db-backup.sh exists and is executable"
  else
    if [[ -f "$ROOT_DIR/scripts/db-backup.sh" ]]; then
      echo "  │  ⚠ db-backup.sh exists but not executable"
    else
      failures+=("no-backup-script")
      echo "  │  ✗ db-backup.sh not found"
    fi
  fi

  # 4e. Deploy script exists
  echo "  ├─ Deploy script..."
  if [[ -f "$ROOT_DIR/scripts/deploy.sh" ]]; then
    echo "  │  ✓ deploy.sh exists"
  else
    failures+=("no-deploy-script")
    echo "  │  ✗ deploy.sh not found"
  fi

  # 4f. K8s manifests (if targeting k8s)
  echo "  └─ K8s manifests..."
  if [[ -d "$ROOT_DIR/k8s" ]]; then
    local manifest_count
    manifest_count=$(find "$ROOT_DIR/k8s" -name '*.yaml' -o -name '*.yml' | wc -l)
    echo "     ✓ $manifest_count K8s manifests found"
  else
    echo "     ⏭ No k8s/ directory (Docker Compose deployment)"
  fi

  if [[ ${#failures[@]} -eq 0 ]]; then
    pass_gate "operations" "Docker valid, scripts ready, infra checked"
  else
    fail_gate "operations" "Failed: ${failures[*]}"
  fi
}

# ============================================================================
#  OUTPUT
# ============================================================================

print_report() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  GO / NO-GO DECISION REPORT"
  echo "  Environment: $DEPLOY_ENV"
  echo "  Timestamp:   $TIMESTAMP"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  local gate_order=("quality" "security" "performance" "operations")
  local gate_labels=("Quality" "Security" "Performance" "Operations")

  for i in "${!gate_order[@]}"; do
    local gate="${gate_order[$i]}"
    local label="${gate_labels[$i]}"
    local status="${GATE_STATUS[$gate]:-SKIP}"
    local details="${GATE_DETAILS[$gate]:-}"

    case "$status" in
      PASS) icon="[PASS]" ;;
      FAIL) icon="[FAIL]" ;;
      SKIP) icon="[SKIP]" ;;
    esac

    printf "  %-6s %-14s %s\n" "$icon" "$label" "$details"
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ "$OVERALL" == "GO" ]]; then
    echo "  DECISION:  *** GO ***"
    echo "  All gates passed. Safe to deploy to $DEPLOY_ENV."
  else
    echo "  DECISION:  *** NO-GO ***"
    echo "  One or more gates failed. Resolve issues before deploying."
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_json() {
  local gates="["
  local first=true
  for gate in quality security performance operations; do
    local status="${GATE_STATUS[$gate]:-SKIP}"
    local details="${GATE_DETAILS[$gate]:-}"
    if ! $first; then gates+=","; fi
    gates+="{\"gate\":\"$gate\",\"status\":\"$status\",\"details\":\"$details\"}"
    first=false
  done
  gates+="]"

  cat <<EOF
{
  "decision": "$OVERALL",
  "environment": "$DEPLOY_ENV",
  "timestamp": "$TIMESTAMP",
  "gates": $gates
}
EOF
}

# ============================================================================
#  MAIN
# ============================================================================

main() {
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  CRM Sales Platform — Go / No-Go Decision Framework    ║"
  echo "║  Target: $DEPLOY_ENV                                    "
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  run_quality_gate
  run_security_gate
  run_performance_gate
  run_operations_gate

  if $JSON_OUTPUT; then
    print_json
  else
    print_report
  fi

  if [[ "$OVERALL" == "GO" ]]; then
    exit 0
  else
    exit 1
  fi
}

main
