#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KEEP_TEMP=false
TMP_REPO=""
SMOKE_FAILED=false
CASE_LOG=""
CASE_STATUS=0
SUMMARY_LINES=()

usage() {
  cat <<'EOF'
Usage: bash scripts/smoke-commit-hooks.sh [--keep-temp]

Runs real git commit smoke cases against the current hook payloads:
- commit-format blocker
- staged-file-limit blocker
- docs-guardrail blocker
- source-file-headers blocker
- valid commit pass
EOF
}

cleanup() {
  if [ -z "$TMP_REPO" ] || [ ! -d "$TMP_REPO" ]; then
    return
  fi

  if [ "$KEEP_TEMP" = "true" ] || [ "$SMOKE_FAILED" = "true" ]; then
    echo "Temporary repo preserved at: $TMP_REPO"
    return
  fi

  rm -rf "$TMP_REPO"
}

fail() {
  echo "SMOKE FAILED: $1" >&2
  SMOKE_FAILED=true
  exit 1
}

assert_status() {
  local expected="$1"
  if [ "$CASE_STATUS" -ne "$expected" ]; then
    fail "case ${2:-unknown} expected exit $expected but got $CASE_STATUS"
  fi
}

assert_log_contains() {
  local needle="$1"
  if ! grep -F "$needle" "$CASE_LOG" >/dev/null 2>&1; then
    fail "missing expected output in $(basename "$CASE_LOG"): $needle"
  fi
}

assert_log_not_contains() {
  local needle="$1"
  if grep -F "$needle" "$CASE_LOG" >/dev/null 2>&1; then
    fail "unexpected output in $(basename "$CASE_LOG"): $needle"
  fi
}

assert_protocol_python() {
  local expression="$1"
  python3 - "$CASE_LOG" "$expression" <<'PY'
import json
import sys
from pathlib import Path

log_path = Path(sys.argv[1])
expression = sys.argv[2]
prefix = "CODEMAP_PRECHECK_PROTOCOL:"
payload = None

for line in log_path.read_text(encoding="utf-8").splitlines():
    if line.startswith(prefix):
        payload = json.loads(line[len(prefix):])

if payload is None:
    raise SystemExit(f"missing protocol line in {log_path.name}")

if not eval(expression, {"payload": payload}):
    raise SystemExit(f"protocol assertion failed for {log_path.name}: {expression}")
PY
}

run_case() {
  local case_name="$1"
  shift
  CASE_LOG="$TMP_REPO/${case_name}.log"

  set +e
  "$@" >"$CASE_LOG" 2>&1
  CASE_STATUS=$?
  set -e

  echo "=== CASE: $case_name (exit $CASE_STATUS) ==="
  cat "$CASE_LOG"
  echo "=== END CASE: $case_name ==="
}

while [ $# -gt 0 ]; do
  case "$1" in
    --keep-temp)
      KEEP_TEMP=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      fail "unknown argument: $1"
      ;;
  esac
  shift
done

trap cleanup EXIT

TMP_REPO="$(mktemp -d /tmp/codemap-commit-smoke-XXXXXX)"
cd "$TMP_REPO"

git init -q
git config user.name "CodeMap Hook Smoke"
git config user.email "hook-smoke@example.com"
git config core.hookspath .githooks

mkdir -p .githooks .mycodemap/hooks .claude scripts node_modules/vitest src
cp "$ROOT_DIR/.githooks/pre-commit" .githooks/pre-commit
cp "$ROOT_DIR/.githooks/commit-msg" .githooks/commit-msg
cp "$ROOT_DIR/.mycodemap/hooks/pre-commit" .mycodemap/hooks/pre-commit
cp "$ROOT_DIR/.mycodemap/hooks/commit-msg" .mycodemap/hooks/commit-msg
chmod +x .githooks/pre-commit .githooks/commit-msg .mycodemap/hooks/pre-commit .mycodemap/hooks/commit-msg

cat > package.json <<'EOF'
{
  "name": "codemap-hook-smoke",
  "version": "1.0.0",
  "scripts": {
    "docs:check": "node scripts/docs-check.js",
    "test": "node scripts/run-tests.js"
  }
}
EOF

cat > scripts/docs-check.js <<'EOF'
const fs = require('node:fs');

if (fs.existsSync('.docs-check-should-fail')) {
  console.error('DOCSYNC: simulated docs drift');
  process.exit(1);
}

console.log('docs:check passed');
EOF

cat > scripts/run-tests.js <<'EOF'
const fs = require('node:fs');

if (fs.existsSync('.tests-should-fail')) {
  console.error('FAILED tests/unit/custom.test.js > fallback runner > reports failure');
  console.error('AssertionError: expected 1 to be 2');
  process.exit(1);
}

console.log('project test passed');
EOF

cat > scripts/validate-rules.py <<'EOF'
#!/usr/bin/env python3
raise SystemExit(0)
EOF
chmod +x scripts/validate-rules.py

cat > node_modules/vitest/vitest.mjs <<'EOF'
#!/usr/bin/env node
process.exit(0);
EOF
chmod +x node_modules/vitest/vitest.mjs

cat > .claude/rule-system.config.json <<'EOF'
{"hard_gate":{"mode":"report-only"}}
EOF

echo "seed" > seed.txt
git add .
git commit -m "[CONFIG] smoke: seed hook fixture" >/dev/null 2>&1 || fail "initial fixture commit failed"

echo "bad" > bad.txt
git add bad.txt
run_case commit-format git commit -m "feat: bad message"
assert_status 1 commit-format
assert_log_contains "RULE_ID: commit-format"
assert_log_contains "HOOK_SOURCE: .mycodemap/hooks/commit-msg"
assert_log_contains "FIX: Rewrite the first line to match: [TAG] scope: message"
assert_log_contains "CODEMAP_PRECHECK_PROTOCOL:"
assert_protocol_python 'payload["hook_source"] == ".mycodemap/hooks/commit-msg"'
assert_protocol_python 'payload["block"]["rule_id"] == "commit-format"'
assert_protocol_python 'payload["next_action"] == "rewrite_commit_message"'
SUMMARY_LINES+=("commit-format: PASS")
git reset HEAD bad.txt >/dev/null 2>&1
rm -f bad.txt

for n in $(seq 1 11); do
  printf 'file %s\n' "$n" > "limit-$n.txt"
  git add "limit-$n.txt"
done
run_case staged-file-limit git commit -m "[FEATURE] limit: exceed staged file count"
assert_status 1 staged-file-limit
assert_log_contains "RULE_ID: staged-file-limit"
assert_log_contains "HOOK_SOURCE: .mycodemap/hooks/pre-commit"
assert_log_contains "FIX: Split the staged changes into smaller commits, then retry."
assert_log_contains "CODEMAP_PRECHECK_PROTOCOL:"
assert_log_not_contains "Running tests for staged files..."
assert_log_not_contains "Running repo-local rule validation"
assert_protocol_python 'payload["commit_allowed"] is False'
assert_protocol_python 'payload["next_action"] == "split_commit"'
assert_protocol_python 'payload["checks"][0]["name"] == "staged-file-limit" and payload["checks"][0]["status"] == "failed"'
assert_protocol_python 'payload["checks"][0]["details"]["staged_count"] == 11'
assert_protocol_python 'payload["block"]["rule_id"] == "staged-file-limit"'
assert_protocol_python 'payload["block"]["resolution"]["type"] == "split_commit"'
assert_protocol_python 'len(payload["block"]["resolution"]["suggested_groups"]) >= 2'
SUMMARY_LINES+=("staged-file-limit: PASS")
git reset HEAD . >/dev/null 2>&1
rm -f limit-*.txt

echo "# docs drift" > README.md
touch .docs-check-should-fail
git add README.md
run_case docs-guardrail git commit -m "[DOCS] docs: trigger docs guardrail"
assert_status 1 docs-guardrail
assert_log_contains "RULE_ID: docs-guardrail"
assert_log_contains "TRIGGERED_BY:"
assert_log_contains "FIX: Run npm run docs:check and resolve the reported documentation drift."
assert_log_not_contains "Running tests for staged files..."
assert_protocol_python 'payload["block"]["rule_id"] == "docs-guardrail"'
assert_protocol_python 'payload["block"]["resolution"]["type"] == "rerun_docs_check"'
SUMMARY_LINES+=("docs-guardrail: PASS")
git reset HEAD README.md >/dev/null 2>&1
rm -f README.md .docs-check-should-fail

cat > src/example.ts <<'EOF'
export const example = 1;
EOF
git add src/example.ts
run_case source-file-headers git commit -m "[FEATURE] src: add example without headers"
assert_status 1 source-file-headers
assert_log_contains "RULE_ID: source-file-headers"
assert_log_contains "FIX: // [META] since:YYYY-MM | owner:team | stable:false"
assert_log_contains "FIX: // [WHY] Explain why this file exists"
assert_protocol_python 'payload["block"]["rule_id"] == "source-file-headers"'
assert_protocol_python 'payload["block"]["resolution"]["type"] == "edit_headers"'
SUMMARY_LINES+=("source-file-headers: PASS")
git reset HEAD src/example.ts >/dev/null 2>&1
rm -f src/example.ts

cat > src/custom.js <<'EOF'
export const custom = true;
EOF
touch .tests-should-fail
git add src/custom.js .tests-should-fail
run_case package-test-fallback git commit -m "[FEATURE] hooks: fallback project test command"
assert_status 1 package-test-fallback
assert_log_contains "RULE_ID: related-tests"
assert_log_contains "TEST_STRATEGY: package-test"
assert_log_contains "TEST_COMMAND: npm test"
assert_log_contains "VERIFY: npm test"
assert_protocol_python 'payload["block"]["rule_id"] == "related-tests"'
assert_protocol_python 'payload["block"]["resolution"]["type"] == "rerun_verify_commands"'
assert_protocol_python 'payload["block"]["resolution"]["test_strategy"] == "package-test"'
assert_protocol_python '"npm test" in payload["block"]["resolution"]["verify_commands"]'
SUMMARY_LINES+=("package-test-fallback: PASS")
git reset HEAD src/custom.js .tests-should-fail >/dev/null 2>&1
rm -f src/custom.js .tests-should-fail

echo "good" > good.txt
git add good.txt
run_case valid-commit git commit -m "[FEATURE] smoke: allow valid commit"
assert_status 0 valid-commit
assert_log_contains "Pre-commit checks passed"
assert_log_contains "Commit message validated"
assert_protocol_python 'payload["commit_allowed"] is True'
assert_protocol_python 'payload["next_action"] == "commit"'
SUMMARY_LINES+=("valid-commit: PASS")

echo "Hook smoke summary:"
for line in "${SUMMARY_LINES[@]}"; do
  echo "- $line"
done

echo "Final commit: $(git rev-parse --short HEAD)"
