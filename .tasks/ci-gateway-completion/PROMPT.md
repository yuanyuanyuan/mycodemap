# 任务：CI Gateway 完整性完善

## 背景

CodeMap 项目的 CI Gateway 当前完成度仅 75%，存在以下关键缺失：

根据 `DEEP_REVIEW_REPORT.md` 分析：

**本地门禁缺失：**
- pre-commit hook 未运行 `npm test`
- pre-commit hook 未异步执行 `npx codemap generate`

**服务端门禁缺失：**
- GitHub Actions 缺少 `npx codemap generate && git diff --exit-code`
- GitHub Actions 缺少 `codemap ci assess-risk --threshold=0.7`
- GitHub Actions 缺少 `codemap ci check-output-contract`

**格式对齐问题：**
- Commit Tag 格式应为大写 `[BUGFIX]` 而非小写 `[feat]`
- Commit 格式应为 `[TAG] scope: message`

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**

> 在执行此任务前，请先查阅以下项目资源：
> - 项目上下文文件：`AGENTS.md` / `CLAUDE.md`
> - 设计文档：`docs/CI_GATEWAY_DESIGN.md`
> - 现有实现：`.githooks/`, `.github/workflows/ci-gateway.yml`, `src/cli/commands/ci.ts`

> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库

## 要求

1. **完善 pre-commit hook**
   - 添加 `npm test` 执行
   - 添加 `npx codemap generate` 异步 AI 饲料生成

2. **完善 GitHub Actions 工作流**
   - 添加 AI 饲料同步检查步骤
   - 添加危险置信度评估步骤 (`assess-risk`)
   - 添加输出契约校验步骤 (`check-output-contract`)

3. **对齐 Commit 格式**
   - Tag 使用大写：`[BUGFIX]`, `[FEATURE]`, `[REFACTOR]`, `[CONFIG]`, `[DOCS]`, `[DELETE]`
   - 格式：`[TAG] scope: message`

4. **可选：配置 Husky 集成**
   - 创建 `.husky/commit-msg` hook
   - 创建 `.husky/pre-commit` hook

## 初始状态

已存在：
- `.githooks/commit-msg` - Commit 格式验证（需对齐 Tag 大小写）
- `.githooks/pre-commit` - 文件头检查（需添加测试和 AI 饲料生成）
- `.github/workflows/ci-gateway.yml` - 部分 CI 步骤（需完善）
- `src/cli/commands/ci.ts` - CI 子命令完整实现

## 约束条件

- 必须遵循 `docs/CI_GATEWAY_DESIGN.md` 的设计规范
- 保持代码量 < 150 行（极简原则）
- 纯文本输出，无 emoji、无颜色
- **禁止使用训练数据中已知但项目未采用的新 API**

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| pre-commit hook 包含 npm test | 代码审查 | 提交前运行测试 |
| pre-commit hook 包含 AI 饲料生成 | 代码审查 | 异步执行 codemap generate |
| GitHub Actions 包含 AI 饲料同步检查 | 代码审查 | generate + git diff |
| GitHub Actions 包含 assess-risk | 代码审查 | 阈值 0.7 |
| GitHub Actions 包含 check-output-contract | 代码审查 | 校验输出契约 |
| Commit Tag 使用大写 | 正则匹配 | 验证 hook 脚本 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 本地测试门禁 | 缺失 | 完整 | positive |
| AI 饲料同步 | 手动 | 自动 | positive |
| 服务端风险评估 | 缺失 | 完整 | positive |
| 输出契约校验 | 缺失 | 完整 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 本地测试运行时间过长
- **场景**: pre-commit hook 同步等待测试完成
- **原因**: 影响提交体验

### 反例用户 2
- **用户特征**: 网络环境不稳定
- **场景**: GitHub Actions 无法访问外部资源
- **原因**: 导致 CI 失败

### 反例实现（AI 常见错误）
- **错误模式**: 在 pre-commit hook 中同步运行 npm test 导致阻塞
- **后果**: 用户提交体验差
- **正确做法**: 按设计文档，使用 `npm test` 同步执行
