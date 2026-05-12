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
    echo "用法: ./scripts/release.sh [选项] [--use-tag <tag>]"
    echo ""
    echo "选项:"
    echo "  patch           发布 patch 版本 (0.2.0 -> 0.2.1)"
    echo "  minor           发布 minor 版本 (0.2.0 -> 0.3.0)"
    echo "  major           发布 major 版本 (0.2.0 -> 1.0.0)"
    echo "  <版本>          指定具体版本号 (例如: 0.2.1)"
    echo "  --use-tag <tag> 使用已有的本地 git tag（跳过创建 tag 步骤）"
    echo "  --yes           跳过交互确认（用于从 /release orchestrator 调用）"
    echo "  --dry-run       显示将执行的操作但不实际执行"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./scripts/release.sh patch              # 发布 patch 版本"
    echo "  ./scripts/release.sh 0.3.0              # 发布指定版本"
    echo "  ./scripts/release.sh 0.3.0 --use-tag v0.3.0  # 使用已有 tag 发布"
    echo "  ./scripts/release.sh 0.3.0 --yes       # 跳过确认（从 orchestrator 调用）"
    echo "  ./scripts/release.sh 0.3.0 --dry-run   # 预览模式"
}

# 解析参数
USE_EXISTING_TAG=""
SKIP_CONFIRM=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --use-tag)
            if [[ -z "$2" || "$2" == --* ]]; then
                echo -e "${RED}❌ 错误: --use-tag 需要指定 tag 名称${NC}"
                exit 1
            fi
            USE_EXISTING_TAG="$2"
            shift 2
            ;;
        --yes)
            SKIP_CONFIRM=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            if [[ -z "$VERSION_TYPE" ]]; then
                VERSION_TYPE="$1"
            else
                echo -e "${RED}❌ 错误: 未知参数 $1${NC}"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$VERSION_TYPE" ]; then
    show_help
    exit 0
fi

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

# 计算新版本（不修改 package.json）
case $VERSION_TYPE in
    patch)
        NEW_VERSION=$(node -e "
            const v = require('./package.json').version.split('.');
            v[2] = parseInt(v[2]) + 1;
            console.log(v.join('.'));
        ")
        ;;
    minor)
        NEW_VERSION=$(node -e "
            const v = require('./package.json').version.split('.');
            v[1] = parseInt(v[1]) + 1;
            v[2] = 0;
            console.log(v.join('.'));
        ")
        ;;
    major)
        NEW_VERSION=$(node -e "
            const v = require('./package.json').version.split('.');
            v[0] = parseInt(v[0]) + 1;
            v[1] = 0;
            v[2] = 0;
            console.log(v.join('.'));
        ")
        ;;
    *)
        # 验证版本号格式
        if ! echo "$VERSION_TYPE" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+' > /dev/null; then
            echo -e "${RED}❌ 错误: 无效的版本号格式: $VERSION_TYPE${NC}"
            echo "版本号必须符合 semver 格式，例如: 0.2.1, 1.0.0"
            exit 1
        fi
        NEW_VERSION=$VERSION_TYPE
        ;;
esac

# 检查 CHANGELOG 是否包含当前版本条目
if [ -f "CHANGELOG.md" ]; then
    if ! grep -q "## \[$NEW_VERSION\]" CHANGELOG.md; then
        echo -e "${RED}❌ 错误: CHANGELOG.md 缺少版本 $NEW_VERSION 的条目${NC}"
        echo -e "请在 CHANGELOG.md 顶部添加版本条目后重试"
        exit 1
    fi
    echo -e "${GREEN}✅ CHANGELOG.md 包含版本 $NEW_VERSION 条目${NC}"
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 当前版本: $CURRENT_VERSION${NC}"
echo -e "${GREEN}🚀 新版本: $NEW_VERSION${NC}"
echo ""

# 验证 --use-tag 参数
if [ -n "$USE_EXISTING_TAG" ]; then
    # 检查 tag 是否存在
    if ! git tag -l "$USE_EXISTING_TAG" | grep -q "$USE_EXISTING_TAG"; then
        echo -e "${RED}❌ 错误: 本地 tag '$USE_EXISTING_TAG' 不存在${NC}"
        echo "可用的本地 tags:"
        git tag -l "v*" | tail -10
        exit 1
    fi

    # 检查 tag 是否指向当前 HEAD 或其祖先
    # 使用 ^{commit} 解析 annotated tag 到实际 commit
    TAG_COMMIT=$(git rev-parse "$USE_EXISTING_TAG^{commit}" 2>/dev/null || git rev-parse "$USE_EXISTING_TAG")
    HEAD_COMMIT=$(git rev-parse HEAD)
    MERGE_BASE=$(git merge-base "$TAG_COMMIT" HEAD 2>/dev/null || echo "")

    if [ "$TAG_COMMIT" != "$HEAD_COMMIT" ] && [ "$TAG_COMMIT" != "$MERGE_BASE" ]; then
        echo -e "${YELLOW}⚠️  警告: tag '$USE_EXISTING_TAG' 不指向当前 HEAD 或其祖先${NC}"
        echo "Tag commit:   $TAG_COMMIT"
        echo "Current HEAD: $HEAD_COMMIT"
        read -p "是否继续使用此 tag? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo -e "${RED}❌ 发布已取消${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}✅ 将使用已有 tag: $USE_EXISTING_TAG${NC}"
    # 覆盖 NEW_VERSION 为 tag 对应的版本（去掉 v 前缀）
    NEW_VERSION=${USE_EXISTING_TAG#v}
    echo ""
fi

# Dry-run 模式：预览将执行的操作（在确认和修改之前）
if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}🔍 DRY RUN 模式 - 以下操作将被执行但不会实际执行:${NC}"
    echo ""
    echo "  1. npm run docs:check:pre-release"
    echo "  2. npm run check:all"
    echo "  3. 更新 package.json version: $CURRENT_VERSION → $NEW_VERSION"
    echo "  4. git add package.json package-lock.json + AI 文档"
    echo "  5. git commit -m \"[CONFIG] version: bump to v$NEW_VERSION\""
    if [ -n "$USE_EXISTING_TAG" ]; then
        echo "  6. 使用已有标签: $USE_EXISTING_TAG"
    else
        echo "  6. git tag -a \"v$NEW_VERSION\" -m \"Release v$NEW_VERSION\""
    fi
    echo "  7. git push origin HEAD"
    echo "  8. git push origin v$NEW_VERSION"
    echo ""
    echo -e "${BLUE}AI 文档将被更新:${NC}"
    for file in llms.txt ai-document-index.yaml AI_GUIDE.md AI_DISCOVERY.md; do
        if [ -f "$file" ]; then
            echo "  • $file: $CURRENT_VERSION → $NEW_VERSION"
        fi
    done
    echo ""
    exit 0
fi

# 同步版本号到 AI 文档（使用词边界避免误匹配）
echo -e "${BLUE}📋 同步版本号到 AI 文档...${NC}"
for file in llms.txt ai-document-index.yaml AI_GUIDE.md AI_DISCOVERY.md; do
  if [ -f "$file" ]; then
    # 使用 \b 词边界确保精确匹配版本号（GNU sed）
    if sed -i "s/\b${CURRENT_VERSION}\b/${NEW_VERSION}/g" "$file" 2>/dev/null; then
      echo -e "   ✅ 已更新 $file"
    else
      # fallback: 不使用词边界（兼容非 GNU sed）
      sed -i "s/${CURRENT_VERSION}/${NEW_VERSION}/g" "$file"
      echo -e "   ✅ 已更新 $file (兼容模式)"
    fi
  fi
done
echo ""

# 确认发布（--yes 跳过）
if [ "$SKIP_CONFIRM" = false ]; then
    read -p "确认发布 v$NEW_VERSION? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        # 恢复被 sed 修改的文件
        git checkout -- llms.txt ai-document-index.yaml AI_GUIDE.md AI_DISCOVERY.md 2>/dev/null || true
        echo -e "${RED}❌ 发布已取消${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ 跳过确认（--yes 模式）${NC}"
fi

echo ""
echo -e "${BLUE}📋 发布步骤:${NC}"
echo ""

# 步骤 1: 运行 pre-release 检查
echo -e "${BLUE}1/6 运行 pre-release 文档检查...${NC}"
if npm run docs:check:pre-release 2>/dev/null; then
    echo -e "${GREEN}   ✅ pre-release 检查通过${NC}"
else
    echo -e "${YELLOW}   ⚠️  pre-release 检查未通过或脚本不存在，继续...${NC}"
fi
echo ""

# 步骤 2: 运行代码检查
echo -e "${BLUE}2/6 运行代码检查...${NC}"
npm run check:all
echo -e "${GREEN}   ✅ 检查通过${NC}"
echo ""

# 步骤 3: 更新 package.json 版本号
echo -e "${BLUE}3/6 更新 package.json 版本号...${NC}"
npm version $NEW_VERSION --no-git-tag-version --allow-same-version
echo -e "${GREEN}   ✅ 已更新到 v$NEW_VERSION${NC}"
echo ""

# 步骤 4: 提交版本更新
echo -e "${BLUE}4/6 提交版本更新...${NC}"
git add package.json package-lock.json
# 也提交被 sed 更新的 AI 文档
for file in llms.txt ai-document-index.yaml AI_GUIDE.md AI_DISCOVERY.md; do
    if [ -f "$file" ]; then
        git add "$file" 2>/dev/null || true
    fi
done
git commit -m "[CONFIG] version: bump to v$NEW_VERSION"
echo -e "${GREEN}   ✅ 已提交版本更新${NC}"
echo ""

# 步骤 5: 创建或使用标签
echo -e "${BLUE}5/6 处理 git tag...${NC}"
if [ -n "$USE_EXISTING_TAG" ]; then
    echo -e "${GREEN}   ✅ 使用已有标签: $USE_EXISTING_TAG${NC}"
else
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    echo -e "${GREEN}   ✅ 已创建标签: v$NEW_VERSION${NC}"
fi
echo ""

# 步骤 6: 推送
echo -e "${BLUE}6/6 推送到远程仓库...${NC}"
git push origin HEAD
if [ -n "$USE_EXISTING_TAG" ]; then
    git push origin "$USE_EXISTING_TAG"
else
    git push origin "v$NEW_VERSION"
fi
echo -e "${GREEN}   ✅ 已推送到远程${NC}"
echo ""

# 完成
echo -e "${GREEN}🎉 发布流程已触发!${NC}"
echo ""
echo -e "${BLUE}GitHub Actions 将会自动:${NC}"
echo "  • 运行 pre-release 文档检查"
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
echo ""
echo -e "${BLUE}验证发布:${NC}"
echo "  npm view @mycodemap/mycodemap version"
