#!/bin/bash
# 任务完成后文档同步检查脚本
# 运行方式: bash .tasks/scripts/post-task-sync-check.sh

echo "=== 任务完成后文档同步检查 ==="
echo ""

ERRORS=0

# 检查AGENTS.md中的任务列表是否与.tasks目录同步
echo "[检查1] 扫描.tasks目录中的任务..."
TASKS_IN_DIR=$(find .tasks -mindepth 1 -maxdepth 1 -type d ! -name ".*" ! -name "scripts" ! -name "templates" ! -name "skills-adapters" ! -name "agents" -printf "%f\n" | sort)

echo "[检查2] 检查AGENTS.md是否包含所有任务..."
for task in $TASKS_IN_DIR; do
    if ! grep -q "$task" AGENTS.md; then
        echo "  ❌ AGENTS.md 缺少任务: $task"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  ✅ AGENTS.md 任务列表已同步"
else
    echo ""
    echo "⚠️  发现 $ERRORS 个不同步问题，请先更新AGENTS.md"
    exit 1
fi

echo ""
echo "[检查3] 检查CLAUDE.md是否包含所有任务..."
for task in $TASKS_IN_DIR; do
    if ! grep -q "$task" CLAUDE.md; then
        echo "  ❌ CLAUDE.md 缺少任务: $task"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  ✅ CLAUDE.md 任务列表已同步"
else
    echo ""
    echo "⚠️  发现 $ERRORS 个不同步问题，请先更新CLAUDE.md"
    exit 1
fi

echo ""
echo "=== ✅ 所有文档同步检查通过 ==="
