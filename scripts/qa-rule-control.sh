#!/usr/bin/env bash

set -u

SCENARIO="all"
TMP_ROOT=""
FAILURES=0

usage() {
  echo "Usage: bash scripts/qa-rule-control.sh --scenario <name|all>" >&2
}

cleanup() {
  if [ -n "${TMP_ROOT}" ] && [ -d "${TMP_ROOT}" ]; then
    rm -rf "${TMP_ROOT}"
  fi
}

trap cleanup EXIT

while [ "$#" -gt 0 ]; do
  case "$1" in
    --scenario)
      SCENARIO="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

if [ -z "${SCENARIO}" ]; then
  usage
  exit 1
fi

TMP_ROOT="$(mktemp -d /tmp/codemap-rule-control-XXXXXX)"

fail() {
  echo "[FAIL] $1"
  FAILURES=$((FAILURES + 1))
}

pass() {
  echo "[PASS] $1"
}

scenario_capability() {
  local output_path="${TMP_ROOT}/capability-report.json"
  if ! python3 scripts/capability-report.py --output "${output_path}" >/dev/null; then
    fail "capability: capability-report command failed"
    return
  fi

  if python3 - "${output_path}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
names = {item["name"] for item in payload["items"]}
assert "python3" in names
assert "node" in names
assert "summary" in payload
PY
  then
    pass "capability"
  else
    fail "capability: output json missing expected fields"
  fi
}

scenario_p0_block() {
  local result
  if ! result="$(python3 - <<'PY'
import importlib.util
import sys
from pathlib import Path

module_path = Path("scripts/validate-rules.py").resolve()
spec = importlib.util.spec_from_file_location("validate_rules", module_path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

checks = [
    module.make_check("typecheck", "P0", ["npm", "run", "typecheck"], "failed", "boom"),
    module.make_check("lint", "P1", ["npm", "run", "lint"], "passed", "ok"),
]
print(module.resolve_exit_code(checks, report_only=False))
PY
)"; then
    fail "p0-block: python verification failed"
    return
  fi

  if [ "${result}" = "1" ]; then
    pass "p0-block"
  else
    fail "p0-block: expected exit code 1, got ${result}"
  fi
}

scenario_p1_warn() {
  local result
  if ! result="$(python3 - <<'PY'
import importlib.util
import sys
from pathlib import Path

module_path = Path("scripts/validate-rules.py").resolve()
spec = importlib.util.spec_from_file_location("validate_rules", module_path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

checks = [
    module.make_check("typecheck", "P0", ["npm", "run", "typecheck"], "passed", "ok"),
    module.make_check("lint", "P1", ["npm", "run", "lint"], "failed", "warn"),
]
print(module.resolve_exit_code(checks, report_only=False))
PY
)"; then
    fail "p1-warn: python verification failed"
    return
  fi

  if [ "${result}" = "2" ]; then
    pass "p1-warn"
  else
    fail "p1-warn: expected exit code 2, got ${result}"
  fi
}

scenario_unavailable() {
  local result
  if ! result="$(python3 - <<'PY'
import importlib.util
import sys
from pathlib import Path

module_path = Path("scripts/validate-rules.py").resolve()
spec = importlib.util.spec_from_file_location("validate_rules", module_path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

checks = module.execute_checks("arch", dist_cli_path=Path("/tmp/codemap-rule-control-missing-dist.js"))
print(module.resolve_exit_code(checks, report_only=False))
PY
)"; then
    fail "unavailable: python verification failed"
    return
  fi

  if [ "${result}" = "4" ]; then
    pass "unavailable"
  else
    fail "unavailable: expected exit code 4, got ${result}"
  fi
}

scenario_disabled_soft_gate() {
  local disabled_root="${TMP_ROOT}/disabled-soft-gate"
  local bytes

  mkdir -p "${disabled_root}/.claude"
  cat > "${disabled_root}/.claude/rule-system.config.json" <<'JSON'
{"enabled":false,"soft_gate":{"change_analyzer":true}}
JSON

  if ! bytes="$(node .claude/hooks/rule-route-advisory.js <<JSON | wc -c | tr -d ' '
{"tool_name":"Edit","cwd":"${disabled_root}","tool_input":{"file_path":"${disabled_root}/src/cli/index.ts"}}
JSON
)"; then
    fail "disabled-soft-gate: hook smoke command failed"
    return
  fi

  if [ "${bytes}" = "0" ]; then
    pass "disabled-soft-gate"
  else
    fail "disabled-soft-gate: expected no advisory output, got ${bytes} bytes"
  fi
}

scenario_rule_context() {
  local output
  if ! output="$(node scripts/rule-context.mjs --files src/cli/index.ts --format json)"; then
    fail "rule-context: helper command failed"
    return
  fi

  if echo "${output}" | grep -q 'docs/rules/code-quality-redlines.md' && \
     ! echo "${output}" | grep -q 'docs/rules/testing.md'; then
    pass "rule-context"
  else
    fail "rule-context: helper output was not scoped as expected"
  fi
}

scenario_no_verify_backstop() {
  if grep -q 'Rule validation backstop' .github/workflows/ci-gateway.yml && \
     grep -q 'python3 scripts/validate-rules.py code' .github/workflows/ci-gateway.yml; then
    pass "no-verify-backstop"
  else
    fail "no-verify-backstop: CI workflow missing backstop step or validator command"
  fi
}

run_selected() {
  case "$1" in
    capability) scenario_capability ;;
    p0-block) scenario_p0_block ;;
    p1-warn) scenario_p1_warn ;;
    unavailable) scenario_unavailable ;;
    disabled-soft-gate) scenario_disabled_soft_gate ;;
    rule-context) scenario_rule_context ;;
    no-verify-backstop) scenario_no_verify_backstop ;;
    *)
      fail "unknown scenario: $1"
      ;;
  esac
}

if [ "${SCENARIO}" = "all" ]; then
  for scenario_name in \
    capability \
    p0-block \
    p1-warn \
    unavailable \
    disabled-soft-gate \
    rule-context \
    no-verify-backstop
  do
    run_selected "${scenario_name}"
  done
else
  run_selected "${SCENARIO}"
fi

if [ "${FAILURES}" -eq 0 ]; then
  echo "RULE_CONTROL_QA: PASS"
  exit 0
fi

echo "RULE_CONTROL_QA: FAIL"
exit 1
