# 任务：Phase 9 - 实现 CI 门禁护栏

## 背景

CodeMap 需要实现双层次 CI 门禁：本地 pre-commit hook 和服务端 GitHub Actions，确保代码质量、Commit 格式、文件头注释等规范得到遵守。

**IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for this task.**

在执行此任务前，请先查阅以下项目资源：
- 架构设计文档：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- CI 门禁设计：`/data/codemap/CI_GATEWAY_DESIGN.md`
- 编排层代码：`/data/codemap/src/orchestrator/`
- 现有 Git hooks：`/data/codemap/.git/hooks/`（如存在）

## 要求

1. **实现 Commit 格式验证**（`src/orchestrator/commit-validator.ts`）
   - 验证 Commit 信息以 `[TAG]` 开头
   - 支持的 TAG：feat, fix, refactor, docs, chore, test, style, perf, ci, build, revert
   - 输出错误码 E0007

2. **实现文件头注释检查**（`src/orchestrator/file-header-scanner.ts`）
   - 检查 TypeScript/JavaScript 文件头包含 `[META]` 或 `[WHY]`
   - 高风险文件需要 `[WHY]` 说明修改原因
   - 输出错误码 E0008, E0009

3. **实现 CI Gateway CLI 命令**
   ```bash
   codemap ci check-commits          # 验证 Commit 格式
   codemap ci check-headers         # 验证文件头注释
   codemap ci assess-risk           # 评估危险置信度
   codemap ci check-output-contract # 验证输出契约
   ```

4. **创建本地 Git Hooks**
   - `.git/hooks/commit-msg`: Commit 格式验证
   - `.git/hooks/pre-commit`: 文件头检查

5. **创建 GitHub Actions 工作流**
   - `.github/workflows/ci-gateway.yml`
   - Commit 格式检查
   - 文件头注释检查
   - 单元测试执行

## 初始状态

从零开始创建：
- `src/orchestrator/commit-validator.ts`
- `src/orchestrator/file-header-scanner.ts`
- `.github/workflows/ci-gateway.yml`
- `.git/hooks/commit-msg`（安装时生成）
- `.git/hooks/pre-commit`（安装时生成）

## 约束条件

- **必须使用 TypeScript 严格模式**（strict: true）
- 所有数值字段必须明确类型（number 而非 any）
- 禁止使用 any 类型
- 必须导出所有公共类型
- 代码风格与现有 src/ 目录保持一致
- Commit TAG 必须符合conventional commits 规范

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| Commit 格式验证 | 检查 commit-validator.ts | 验证 [TAG] 前缀 |
| 文件头检查 | 检查 file-header-scanner.ts | 验证 [META]/[WHY] 存在 |
| CI 命令实现 | 检查 cli/commands/ci.ts | 4 个子命令 |
| 本地 Hook | 检查 .git/hooks/ | commit-msg + pre-commit |
| GitHub Actions | 检查 .github/workflows/ | ci-gateway.yml |
| TypeScript 编译通过 | `npx tsc --noEmit` | 无类型错误 |
| 单元测试通过 | `npm test` | 测试覆盖率 > 80% |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| Commit 规范 | 随意提交 | [TAG] 格式强制 | positive - 清晰变更类型 |
| 文件头注释 | 可选 | 必需 [META]/[WHY] | positive - 代码可维护性 |
| CI 自动检查 | 手动审查 | 自动门禁 | positive - 质量前置 |

## 反例场景

### 反例实现 1
- **错误模式**: 仅检查新文件，忽略修改文件
- **后果**: 存量文件不符合规范
- **正确做法**: 检查所有 .ts/.js 文件

### 反例实现 2
- **错误模式**: Hook 安装需要手动执行
- **后果**: 用户忘记安装，规则失效
- **正确做法**: 在 package.json 的 postinstall 脚本中自动安装

### 反例实现 3
- **错误模式**: CI 检查失败但未提供修复建议
- **后果**: 用户不知道如何修复
- **正确做法**: 错误信息包含修复命令示例
