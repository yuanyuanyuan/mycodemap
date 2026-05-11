#!/bin/bash
# Session Evidence Collector
# 自动收集 Kimi Code CLI 会话现场证据

set -euo pipefail

WORKSPACE_ID=""
SESSION_UUID=""
OUTPUT_DIR="session-evidence"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="session-evidence-${TIMESTAMP}.tar.gz"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. 定位当前 Kimi 会话
find_current_session() {
    local sessions_dir="${HOME}/.kimi/sessions"

    if [[ ! -d "$sessions_dir" ]]; then
        log_error "~/.kimi/sessions/ 目录不存在"
        exit 1
    fi

    # 找到最新的 workspace
    WORKSPACE_ID=$(ls -t "$sessions_dir" | head -1)
    if [[ -z "$WORKSPACE_ID" ]]; then
        log_error "没有找到任何会话 workspace"
        exit 1
    fi

    # 找到最新的 session UUID
    SESSION_UUID=$(ls -t "${sessions_dir}/${WORKSPACE_ID}" | head -1)
    if [[ -z "$SESSION_UUID" ]]; then
        log_error "没有找到任何会话 UUID"
        exit 1
    fi

    log_info "定位到当前会话: ${WORKSPACE_ID}/${SESSION_UUID}"
}

# 2. 创建输出目录
prepare_output() {
    if [[ -d "$OUTPUT_DIR" ]]; then
        log_warn "目录 ${OUTPUT_DIR} 已存在，将被覆盖"
        rm -rf "$OUTPUT_DIR"
    fi

    mkdir -p "${OUTPUT_DIR}/kimi-session"
    mkdir -p "${OUTPUT_DIR}/git-state"
    mkdir -p "${OUTPUT_DIR}/retrospective"

    log_info "创建输出目录: ${OUTPUT_DIR}"
}

# 3. 复制 Kimi 会话文件
collect_kimi_session() {
    local session_dir="${HOME}/.kimi/sessions/${WORKSPACE_ID}/${SESSION_UUID}"

    if [[ ! -d "$session_dir" ]]; then
        log_error "会话目录不存在: ${session_dir}"
        exit 1
    fi

    # 复制核心文件
    for file in context.jsonl wire.jsonl state.json; do
        if [[ -f "${session_dir}/${file}" ]]; then
            cp "${session_dir}/${file}" "${OUTPUT_DIR}/kimi-session/"
            log_info "已复制: ${file} ($(du -h "${session_dir}/${file}" | cut -f1))"
        else
            log_warn "文件不存在: ${file}"
        fi
    done

    # 如果有 subagents 目录，也复制
    if [[ -d "${session_dir}/subagents" ]]; then
        cp -r "${session_dir}/subagents" "${OUTPUT_DIR}/kimi-session/"
        log_info "已复制: subagents/"
    fi
}

# 4. 收集 Git 状态
collect_git_state() {
    if [[ ! -d ".git" ]]; then
        log_warn "当前目录不是 git 仓库"
        return
    fi

    git status > "${OUTPUT_DIR}/git-state/status.txt"
    git log --oneline -20 > "${OUTPUT_DIR}/git-state/log.txt"
    git log --format="%h %s%n%b---" -20 > "${OUTPUT_DIR}/git-state/log-detail.txt"
    git diff --stat > "${OUTPUT_DIR}/git-state/diff-stat.txt" 2>/dev/null || true

    log_info "已收集 Git 状态"
}

# 5. 收集系统信息
collect_system_info() {
    {
        echo "=== 系统信息 ==="
        echo "时间: $(date -Iseconds)"
        echo "主机: $(hostname)"
        echo "用户: $(whoami)"
        echo "PWD: $(pwd)"
        echo ""
        echo "=== 环境变量 ==="
        env | grep -E '^(PATH|HOME|SHELL|USER|TERM|LANG|EDITOR|KIMI|CLAUDE|CODEX)' | sort
    } > "${OUTPUT_DIR}/system-info.txt"

    log_info "已收集系统信息"
}

# 6. 打包
archive_evidence() {
    tar -czvf "$ARCHIVE_NAME" "$OUTPUT_DIR/"
    local size=$(du -h "$ARCHIVE_NAME" | cut -f1)
    log_info "打包完成: ${ARCHIVE_NAME} (${size})"
}

# 7. 生成元数据
generate_metadata() {
    cat > "${OUTPUT_DIR}/metadata.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "workspace_id": "${WORKSPACE_ID}",
  "session_uuid": "${SESSION_UUID}",
  "working_directory": "$(pwd)",
  "archive_name": "${ARCHIVE_NAME}",
  "collected_files": [
    "kimi-session/context.jsonl",
    "kimi-session/wire.jsonl",
    "kimi-session/state.json",
    "git-state/status.txt",
    "git-state/log.txt",
    "git-state/log-detail.txt",
    "git-state/diff-stat.txt",
    "system-info.txt",
    "metadata.json"
  ]
}
EOF
}

# 主流程
main() {
    log_info "开始收集会话证据..."

    find_current_session
    prepare_output
    collect_kimi_session
    collect_git_state
    collect_system_info
    generate_metadata
    archive_evidence

    log_info "完成！证据已保存到: ${ARCHIVE_NAME}"
    log_info "解压后查看: tar -tzf ${ARCHIVE_NAME}"
}

main "$@"
