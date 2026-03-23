#!/bin/bash
# [META] since:2026-03 | owner:release-team | stable:true
# [WHY] 发布助手脚本 - 简化版本发布流程

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 帮助信息
show_help() {
    echo "用法: ./scripts/release.sh [选项]"
    echo ""
    echo "选项:"
    echo "  patch    发布 patch 版本 (0.2.0 -> 0.2.1)"
    echo "  minor    发布 minor 版本 (0.2.0 -> 0.3.0)"
    echo "  major    发布 major 版本 (0.2.0 -> 1.0.0)"
    echo "  <版本>   指定具体版本号 (例如: 0.2.1)"
    echo "  --help   显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./scripts/release.sh patch    # 发布 patch 版本"
    echo "  ./scripts/release.sh 0.3.0    # 发布指定版本"
}

# 检查参数
if [ $# -eq 0 ] || [ "$1" == "--help" ]; then
    show_help
    exit 0
fi

VERSION_TYPE=$1

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: 当前目录不是 git 仓库${NC}"
    exit 1
fi

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  警告: 工作区有未提交的修改${NC}"
    git status --short
    echo ""
    read -p "是否继续? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${RED}❌ 发布已取消${NC}"
        exit 1
    fi
    echo ""
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 当前版本: $CURRENT_VERSION${NC}"

# 计算新版本
case $VERSION_TYPE in
    patch)
        NEW_VERSION=$(npm version patch --no-git-tag-version)
        NEW_VERSION=${NEW_VERSION#v}
        ;;
    minor)
        NEW_VERSION=$(npm version minor --no-git-tag-version)
        NEW_VERSION=${NEW_VERSION#v}
        ;;
    major)
        NEW_VERSION=$(npm version major --no-git-tag-version)
        NEW_VERSION=${NEW_VERSION#v}
        ;;
    *)
        # 验证版本号格式
        if ! echo "$VERSION_TYPE" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+' > /dev/null; then
            echo -e "${RED}❌ 错误: 无效的版本号格式: $VERSION_TYPE${NC}"
            echo "版本号必须符合 semver 格式，例如: 0.2.1, 1.0.0"
            exit 1
        fi
        NEW_VERSION=$VERSION_TYPE
        npm version $NEW_VERSION --no-git-tag-version --allow-same-version 2>/dev/null || true
        ;;
esac

echo -e "${GREEN}🚀 新版本: $NEW_VERSION${NC}"
echo ""

# 确认发布
read -p "确认发布 v$NEW_VERSION? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    # 恢复 package.json
    git checkout package.json package-lock.json 2>/dev/null || true
    echo -e "${RED}❌ 发布已取消${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 发布步骤:${NC}"
echo ""

# 步骤 1: 运行检查
echo -e "${BLUE}1/5 运行代码检查...${NC}"
npm run check:all
echo -e "${GREEN}   ✅ 检查通过${NC}"
echo ""

# 步骤 2: 提交版本更新
echo -e "${BLUE}2/5 提交版本更新...${NC}"
git add package.json package-lock.json
git commit -m "[RELEASE] bump version to v$NEW_VERSION"
echo -e "${GREEN}   ✅ 已提交版本更新${NC}"
echo ""

# 步骤 3: 创建标签
echo -e "${BLUE}3/5 创建 git tag...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
echo -e "${GREEN}   ✅ 已创建标签: v$NEW_VERSION${NC}"
echo ""

# 步骤 4: 推送
echo -e "${BLUE}4/5 推送到远程仓库...${NC}"
git push origin HEAD
git push origin "v$NEW_VERSION"
echo -e "${GREEN}   ✅ 已推送到远程${NC}"
echo ""

# 步骤 5: 完成
echo -e "${GREEN}5/5 🎉 发布流程已触发!${NC}"
echo ""
echo -e "${BLUE}GitHub Actions 将会自动:${NC}"
echo "  • 构建项目"
echo "  • 运行测试"
echo "  • 发布到 NPM"
echo "  • 创建 GitHub Release"
echo ""
echo -e "${BLUE}查看发布状态:${NC}"
echo "  https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//;s/.git$//')/actions"
echo ""
echo -e "${BLUE}NPM 包页面:${NC}"
echo "  https://www.npmjs.com/package/@mycodemap/mycodemap"
