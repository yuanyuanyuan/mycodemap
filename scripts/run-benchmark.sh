#!/bin/bash
# [META] CodeMap 基准测试运行脚本
# [WHY] 基准测试运行时间长，需要单独执行而非包含在常规测试中

set -e

echo "==================================="
echo "CodeMap 基准测试"
echo "==================================="
echo ""
echo "注意：此测试运行 30 个查询，每个查询最多 5 秒"
echo "预计总时间：30 秒 - 2 分钟"
echo ""

# 确保已构建
echo "[1/2] 检查构建状态..."
if [ ! -d "dist" ]; then
    echo "  需要构建项目..."
    npm run build
fi

# 运行基准测试
echo "[2/2] 运行基准测试..."
npx vitest run --config vitest.benchmark.config.ts "$@"

echo ""
echo "==================================="
echo "基准测试完成"
echo "==================================="
