#!/bin/sh
# 安装 Git Hooks 脚本
# 同步 canonical payload 到 .mycodemap/hooks，再通过 .githooks shim 接入 Git

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GITHOOKS_DIR="$PROJECT_ROOT/.githooks"
TEMPLATE_DIR="$PROJECT_ROOT/scripts/hooks/templates"
PAYLOAD_DIR="$PROJECT_ROOT/.mycodemap/hooks"

if [ ! -d "$GITHOOKS_DIR" ]; then
  echo "ERROR: .githooks directory not found: $GITHOOKS_DIR"
  exit 1
fi

REQUIRED_HOOKS="commit-msg pre-commit"
mkdir -p "$PAYLOAD_DIR"

for hook in $REQUIRED_HOOKS; do
  hook_path="$GITHOOKS_DIR/$hook"
  template_path="$TEMPLATE_DIR/$hook"
  payload_path="$PAYLOAD_DIR/$hook"

  if [ ! -f "$hook_path" ]; then
    echo "ERROR: Missing legacy shim hook: $hook_path"
    exit 1
  fi

  if [ ! -f "$template_path" ]; then
    echo "ERROR: Missing canonical hook template: $template_path"
    exit 1
  fi

  cp "$template_path" "$payload_path"
  chmod +x "$payload_path"
  chmod +x "$hook_path"
done

cd "$PROJECT_ROOT"
git config core.hookspath .githooks

echo "Git hooks installed successfully"
echo "Canonical hook payloads: .mycodemap/hooks"
echo "Git entrypoint: .githooks -> .mycodemap/hooks"
echo "Installed hooks: commit-msg, pre-commit"
