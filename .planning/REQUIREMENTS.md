# Requirements: Milestone v2.1 ux-onboarding-enhancement

> REQ-IDs continue from existing project numbering.
> Created: 2026-05-01

## Active Requirements (v2.1)

### First-Run Concierge (FRC)

- [ ] **FRC-01**: 新用户首次运行 `codemap` 时，系统自动检测项目类型（Node.js / Python / Go / Rust / 通用）
- [ ] **FRC-02**: 根据检测到的项目类型推荐匹配的 Bootstrap Profile（解析器配置、推荐规则集、忽略模式）
- [ ] **FRC-03**: Profile 包含可覆盖的默认值：语言特定解析器设置、常见忽略模式、推荐分析深度
- [ ] **FRC-04**: 用户可在交互模式下查看推荐 profile 详情并选择接受、修改或跳过

### Zero-Config Preview (ZCP)

- [ ] **ZCP-01**: 运行 `codemap preview` 无需 `mycodemap.config.json` 或任何预配置
- [ ] **ZCP-02**: 系统自动检测项目结构（入口文件、源码目录、测试目录）并推断合理分析范围
- [ ] **ZCP-03**: 预览输出精简摘要：文件数、模块数、关键依赖关系、复杂度热点
- [ ] **ZCP-04**: 预览结束后提示用户 `--save` 保存为正式配置，或 `--discard` 丢弃临时分析

### Agent Bootstrap (ABT)

- [ ] **ABT-01**: `mycodemap init` 生成 per-runtime assistant 引导片段（Claude / Codex / generic）
- [ ] **ABT-02**: 生成资产写入 `.mycodemap/assistants/` 目录，按 runtime 分类存放
- [ ] **ABT-03**: Init 收据显式报告 agent 上下文连接状态：已生成片段、需手动添加的引用、已同步检测
- [ ] **ABT-04**: 默认不自动重写用户项目的 `CLAUDE.md` / `AGENTS.md`；输出可复制的 copy-paste 片段
- [ ] **ABT-05**: 支持 `--profile claude|codex|generic` 标志选择目标 assistant 类型

### Subagent Delegation Contract (SDC)

- [ ] **SDC-01**: 存在单一 canonical Project Environment Contract，供 delegated sub-agent prompt 前置注入使用
- [ ] **SDC-02**: Contract 明确包含 RTK shell 包装、`[TAG] scope: message` commit 格式、当前 Vitest 入口/命令、CodeMap/rule-context 优先级
- [ ] **SDC-03**: Contract 注入覆盖 edit / review / verification delegation 路径，并覆盖无 scoped rules 命中的场景
- [ ] **SDC-04**: Contract 内容从仓库事实或生成源派生；当 commit/test/runtime 契约漂移时，验证必须失败
- [ ] **SDC-05**: 至少一条验证路径必须通过 Claude Code `claude -p` 或 Codex `codex exec` 真实启动 sub-agent，并保留 prompt/output 证据

### Init Infrastructure (INI)

- [ ] **INI-01**: `mycodemap init --json` 返回真实的 machine-readable `InitReceipt` JSON（当前 contract 声明但实现不一致）
- [ ] **INI-02**: Init 完成后显示基于 receipt 的个性化下一步（替代当前固定三步欢迎信息）
- [ ] **INI-03**: Setup 文档（README, SETUP_GUIDE, AI_ASSISTANT_SETUP）同步描述新流程：安装 → init → doctor → generate → 连接 agent

### Verification (VER)

- [ ] **VER-01**: 真实临时项目验证：空目录、Node.js 项目、已有旧配置项目三种场景
- [ ] **VER-02**: Idempotency 验证：重复运行 `mycodemap init` 稳定输出 `already-synced` 状态
- [ ] **VER-03**: 至少一条验证路径通过子进程调用构建后的 CLI，而非仅 in-process TypeScript 函数调用

## Deferred Requirements (Future Milestones)

| REQ-ID | Description | Target Milestone |
|--------|-------------|------------------|
| AGENT-10 | 剩余 12+ CLI 命令迁移到 contract schema | Continuous / v2.2+ |
| AGENT-11 | benchmark 命令迁移到共享输出基础设施 | Continuous / v2.2+ |
| INT-04 | Auto-Provisioned Agent Skills | v2.2 agent-integration-completion |
| INT-05 | MCP `verify_contract` Tool | v2.2 agent-integration-completion |
| ARCH-01 | Auto-Generate design.md from codebase | v3.0 architecture-intelligence |
| ARCH-02 | Auto-Generate Architecture Remediation Patches | v3.0 architecture-intelligence |
| ARCH-03 | Self-Healing Design Contract (Drift Approval) | v3.0 architecture-intelligence |
| ARCH-04 | SQLite + In-Memory Graph Migration (complete Kùzu removal) | v3.0 architecture-intelligence |

## Out of Scope

- **Phase 50 (Release Local Pre-Release Check Gap)**: 发布治理问题，与 UX/Onboarding 无关。保持独立执行。
- **Phase 52 (CodeMap CLI Priority Harness Guard)**: Runtime/session 合规检测，属于 Agent Integration / Governance 范畴。延至 v2.2 或单独执行。
- **自动重写用户项目的 `CLAUDE.md` / `AGENTS.md`**: 默认行为必须是 no-op；任何 opt-in 写模式必须显式、分离、在收据中可见。
- **非 Git 版本控制系统支持**: 仅支持 Git。
- **项目类型特定规则集动态生成**: Profile 提供推荐默认值，不承诺按项目类型生成完全不同的规则集。
- **真实 npm publish / GitHub Release**: Release 操作仍为 L3，需显式 `/release` 触发。

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| FRC-01 | 53 | — | pending |
| FRC-02 | 53 | — | pending |
| FRC-03 | 53 | — | pending |
| FRC-04 | 53 | — | pending |
| ZCP-01 | 54 | — | pending |
| ZCP-02 | 54 | — | pending |
| ZCP-03 | 54 | — | pending |
| ZCP-04 | 54 | — | pending |
| ABT-01 | 55 | — | pending |
| ABT-02 | 55 | — | pending |
| ABT-03 | 56 | — | pending |
| ABT-04 | 56 | — | pending |
| ABT-05 | 55 | — | pending |
| SDC-01 | 58 | — | pending |
| SDC-02 | 58 | — | pending |
| SDC-03 | 58 | — | pending |
| SDC-04 | 58 | — | pending |
| SDC-05 | 58 | — | pending |
| INI-01 | 55 | — | pending |
| INI-02 | 56 | — | pending |
| INI-03 | 56 | — | pending |
| VER-01 | 57 | — | pending |
| VER-02 | 57 | — | pending |
| VER-03 | 57 | — | pending |
