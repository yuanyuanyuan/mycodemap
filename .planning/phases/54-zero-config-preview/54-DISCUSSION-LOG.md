# Phase 54: Zero-Config Preview - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 54-zero-config-preview
**Areas discussed:** Preview 与 generate 的关系, 零配置下的项目结构推断, Preview 输出格式与内容, --save 渐进承诺交互

---

## Preview 与 generate 的关系

| Option | Description | Selected |
|--------|-------------|----------|
| generate 的轻量 wrapper | preview 是 generate 的零配置快捷入口，内部调用 generate 的轻量子集，共享核心分析逻辑 | ✓ |
| 独立命令，独立分析路径 | preview 完全独立实现，使用 globby + escomplex 等轻量分析器 | |
| generate 的子命令/flag | preview 是 generate --preview，共享 generate 的所有逻辑 | |

**User's choice:** generate 的轻量 wrapper
**Notes:** 共享代码避免维护分歧；用户可以无缝从 preview 升级到 generate。

### Fallback config

| Option | Description | Selected |
|--------|-------------|----------|
| Profile fallback + 最小默认 | 使用 Phase 53 Bootstrap Profile 作为 fallback，无 profile 时使用最小硬编码默认值 | ✓ |
| 仅 Profile，无 profile 则拒绝 | 只用 Bootstrap Profile，没有则拒绝运行 | |
| 最小默认值，不用 Profile | 只用硬编码默认值，不依赖 Profile 系统 | |

**User's choice:** Profile fallback + 最小默认

### 跳过重型步骤

| Option | Description | Selected |
|--------|-------------|----------|
| 跳过重型步骤 | 跳过 symbol-level 分析、graph 持久化、完整依赖图构建，仅保留文件发现、模块统计、顶层依赖、复杂度快速评分 | ✓ |
| 完整分析，仅跳过持久化 | 运行 generate 的完整分析，只不持久化 | |

**User's choice:** 跳过重型步骤

### --save 行为

| Option | Description | Selected |
|--------|-------------|----------|
| 写 config + 运行 generate | --save 写 config.json 并运行完整 generate | ✓ |
| 仅写 config，不自动 generate | --save 只写 config.json | |
| 写 config + 提示用户手动 generate | 写 config 并提示用户手动运行 generate | |

**User's choice:** 写 config + 运行 generate

---

## 零配置下的项目结构推断

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 Phase 53 detection + profile | 复用 detectProjectType() 获取项目类型，从 Bootstrap Profile 读取 parser/ignore 配置 | ✓ |
| Profile + 目录启发式增强 | 在 detection 基础上增加目录启发式（src/、lib/、test/） | |
| 简单 glob 扫描，无 detection | 直接用 globby 扫描所有源码文件 | |

**User's choice:** 复用 Phase 53 detection + profile

### 无 marker 时的行为

| Option | Description | Selected |
|--------|-------------|----------|
| fallback 到 generic profile | 使用 generic profile 提供最小默认值，继续运行 preview | ✓ |
| 拒绝运行 | 提示用户创建 marker 文件或指定 --profile | |

**User's choice:** fallback 到 generic profile
**Notes:** 与 init (D-04 规定拒绝) 不同，因为 preview 的目标是让用户即时看到价值。

---

## Preview 输出格式与内容

### 输出格式

| Option | Description | Selected |
|--------|-------------|----------|
| JSON 默认 + --human/TTY 检测 | 遵循 v2.0 AI-First Default Output 范式 | ✓ |
| 人类可读默认 + --json flag | 默认输出表格/颜色，--json 提供 machine-readable | |

**User's choice:** JSON 默认 + --human/TTY 检测

### 复杂度热点计算

| Option | Description | Selected |
|--------|-------------|----------|
| escomplex 文件级热点 | 使用 typhonjs-escomplex 进行文件级复杂度分析，展示 top-5 热点 | ✓ |
| 仅文件/模块/依赖三指标 | 不展示复杂度热点 | |
| 简单行数/函数数统计 | 用行数+函数数作为复杂度代理 | |

**User's choice:** escomplex 文件级热点

### "关键依赖关系"定义

| Option | Description | Selected |
|--------|-------------|----------|
| 直接依赖列表 | 从 package.json/go.mod 等读取直接依赖 | ✓ |
| 源码 import 依赖图 | 用正则解析 import 语句 | |

**User's choice:** 直接依赖列表

---

## --save 渐进承诺交互

### 提示方式

| Option | Description | Selected |
|--------|-------------|----------|
| 末尾提示文字 | 输出末尾显示一行提示文字，不阻塞 | ✓ |
| TTY 交互询问 + 非 TTY 提示 | TTY 下交互式询问，非 TTY 下显示提示 | |
| 无提示，纯 flag 驱动 | 不显示任何提示 | |

**User's choice:** 末尾提示文字

### --discard 语义

| Option | Description | Selected |
|--------|-------------|----------|
| --discard 是显式 no-op | 明确表达"我不要"但实际无操作 | |
| 不需要 --discard，仅 --save | preview 本身不写磁盘，保存必须用 --save | ✓ |
| --discard 清除临时缓存 | 清除 preview 临时缓存 | |

**User's choice:** 不需要 --discard，仅 --save

---

## Claude's Discretion

- Exact preview command file structure (single file vs splitting)
- Whether to extract shared "lightweight analysis" from generate or call generate with disabled-flags
- Exact hint text wording
- Whether --save runs generate synchronously or async
- Exact JSON output schema field names
- Whether preview registers its own contract file or shares with generate
- Error handling details for escomplex file-level failures

## Deferred Ideas

- Interactive modify / Q&A during preview → future milestone
- `--discard` flag → permanently out of scope
- Source-code import dependency graph → future milestone
- Directory-structure heuristics beyond profiles → future milestone
- Function-level complexity breakdown → future milestone
- Preview caching / incremental results → future milestone
