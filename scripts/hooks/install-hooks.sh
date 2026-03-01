#!/bin/sh
# 安装 Git Hooks 脚本
# 使用 .githooks 目录并在 git config 中配置 core.hookspath

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GITHOOKS_DIR="$PROJECT_ROOT/.githooks"

# 确保 .githooks 目录存在
mkdir -p "$GITHOOKS_DIR"

# 复制 hook 脚本
echo "Installing commit-msg hook..."
cp "$SCRIPT_DIR/commit-msg" "$GITHOOKS_DIR/commit-msg"
chmod +x "$GITHOOKS_DIR/commit-msg"

echo "Installing pre-commit hook..."
cp "$SCRIPT_DIR/pre-commit" "$GITHOOKS_DIR/pre-commit"
chmod +x "$GITHOOKS_DIR/pre-commit"

# 配置 git 使用 .githooks 目录
echo "Configuring git to use .githooks directory..."
cd "$PROJECT_ROOT"
git config core.hookspath .githooks

echo "✅ Git hooks installed successfully!"
echo "   - Hooks directory: .githooks/"
echo "   - commit-msg: Validates commit message format"
echo "   - pre-commit: Validates file headers"
