#!/bin/sh
# 安装 Git Hooks 脚本
# 统一使用仓库中的 .githooks 目录，禁止用其他模板覆盖

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GITHOOKS_DIR="$PROJECT_ROOT/.githooks"

if [ ! -d "$GITHOOKS_DIR" ]; then
  echo "ERROR: .githooks directory not found: $GITHOOKS_DIR"
  exit 1
fi

REQUIRED_HOOKS="commit-msg pre-commit"
for hook in $REQUIRED_HOOKS; do
  hook_path="$GITHOOKS_DIR/$hook"
  if [ ! -f "$hook_path" ]; then
    echo "ERROR: Missing required hook: $hook_path"
    exit 1
  fi
  chmod +x "$hook_path"
done

cd "$PROJECT_ROOT"
git config core.hookspath .githooks

echo "Git hooks installed successfully"
echo "Hooks directory: .githooks"
echo "Installed hooks: commit-msg, pre-commit"
