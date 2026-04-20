# E2E 测试用例 — 工作流全流程

> 版本: 1.0 | 日期: 2026-04-20
> 范围: `tests/e2e/workflow-fullflow.e2e.test.ts`
> 测试目标: `WorkflowOrchestrator` + `WorkflowTemplateManager` + `PhaseInheritance` + `ResultFusion`

## 用例总览

| 编号 | 用户痛点 | 入口 | 关键 API | 断言重点 |
|---|---|---|---|---|
| E2E-001 | 重构前怕改崩 | `start("重构 auth 模块")` | `start→executeCurrentPhase→proceedToNextPhase` | 阶段顺序、结果继承、置信度达标 |
| E2E-002 | 线上 Bug 紧急修复 | `start("urgent fix token undefined")` | `start→applyTemplate→executeCurrentPhase` | 模板=hotfix、低门槛、完整跑通 |
| E2E-003 | 分析跑到一半断了 | `start→checkpoint→resume` | `checkpoint→resume→proceedToNextPhase` | 上下文保留、产物完整、阶段正确 |
| E2E-004 | 不同任务不该用同一个模板 | `recommendTemplate(任务描述)` | `recommendTemplate` | 关键词→模板映射、阈值差异 |
| E2E-005 | 大项目怕卡死 | `start` + 大量 mock 结果 | `executeCurrentPhase` 配合 topK | topK 截断、累积上下文有界、<1秒 |
| E2E-006 | 分析质量差时不该继续推进 | `start` + 低质量结果 | `canProceed→getGuidance` | 验证失败、引导=hold |
| E2E-007 | 内置模板不合适 | `saveTemplate→start(自定义模板)` | `saveTemplate→applyTemplate` | 自定义阈值生效、阶段定义来自自定义 |

---

## 详细用例

### E2E-001: 重构前摸底——"改了 auth 会不会崩？"

**用户故事**：我要重构 auth 模块，但不知道改了会影响哪些地方。我需要 CodeMap 帮我跑一遍完整分析，告诉我哪些文件会受影响。

```yaml
前提:
  项目: "有 auth 模块，被 12 个文件依赖"
  任务: "重构 auth 模块"
操作:
  - orchestrator.start("重构 auth 模块")
  - orchestrator.executeCurrentPhase(分析参数)   # find 阶段
  - orchestrator.proceedToNextPhase()             # → read 阶段
  - orchestrator.executeCurrentPhase(分析参数)   # read 阶段
  - orchestrator.proceedToNextPhase()             # → link 阶段
  - orchestrator.executeCurrentPhase(分析参数)   # link 阶段
  - orchestrator.proceedToNextPhase()             # → show 阶段
  - orchestrator.executeCurrentPhase(分析参数)   # show 阶段
期待结果:
  - 当前阶段 === 'show'
  - 产物中有 find 阶段的结果 ✅
  - 产物中有 read 阶段的结果 ✅
  - 产物中有 link 阶段的结果 ✅
  - 产物中有 show 阶段的结果 ✅
  - 每个阶段的置信度分数 ≥ 该阶段的最低门槛
  - show 阶段的结果包含了 find+read+link 的文件（通过继承）
```

**具体示例**：

```
用户输入:  codemap workflow start "重构 auth 模块"

系统执行:
  find 阶段 → ast-grep 搜索 "auth" → 找到:
    - src/auth.ts          (相关度 0.95)
    - src/middleware/auth.ts (相关度 0.85)

  read 阶段 → CodeMap 读取影响范围 → 找到:
    - src/auth.ts 被 12 个文件引用 (相关度 0.9)

  link 阶段 → 关联依赖链 → 找到:
    - src/auth.ts → src/payment.ts → src/checkout.ts (相关度 0.88)

  show 阶段 → 展示影响报告:
    - 高风险: src/auth.ts (被 12 个文件依赖)
    - 中风险: src/payment.ts, src/checkout.ts
    - 继承了前面所有阶段的结果，汇总展示

最终产物:
  artifacts = {
    find:  [src/auth.ts, src/middleware/auth.ts],
    read:  [src/auth.ts (12个引用)],
    link:  [src/auth.ts → payment → checkout],
    show:  [影响报告: 高风险2个, 中风险1个]
  }
```

---

### E2E-002: 线上 Bug 紧急修复——"快速定位 token undefined"

**用户故事**：生产环境报错 `TypeError: Cannot read property 'token' of undefined`，我需要最快速度定位问题，不想被高门槛卡住。

```yaml
前提:
  任务: "urgent fix token undefined error"
操作:
  - template = recommendTemplate(任务描述)
  - orchestrator.start(任务描述, { template: template.name })
  - orchestrator.executeCurrentPhase(分析参数)   # find 阶段（门槛 0.1）
  - orchestrator.proceedToNextPhase()
  - orchestrator.executeCurrentPhase(分析参数)   # read 阶段（门槛 0.2）
  - orchestrator.proceedToNextPhase()
期待结果:
  - 推荐的模板名称 === 'hotfix'
  - hotfix 模板 find 阶段最低置信度 === 0.1
  - 整个工作流跑通，没有被置信度门槛卡住
  - 上下文中的模板名 === 'hotfix'
```

**具体示例**：

```
用户输入:  codemap workflow start "urgent fix token undefined error"

系统推荐模板:
  任务包含 "urgent" + "fix" + "error" → 推荐 hotfix 模板

  对比各模板的 find 阶段门槛:
    hotfix:     0.1  ← 最宽松，快速推进
    bugfix:     0.2
    refactoring: 0.3
    feature:    0.4  ← 最严格，分析更全面

系统执行:
  find 阶段 → 搜索 "token" → 找到 5 个文件
    置信度 0.25 > 门槛 0.1 ✅ 可以继续

  read 阶段 → 分析空值检查 → 找到 3 个缺少检查的位置
    置信度 0.35 > 门槛 0.2 ✅ 可以继续

  （如果用 feature 模板，find 门槛 0.4，置信度 0.25 < 0.4 → 会被卡住！）
```

---

### E2E-003: 断点续跑——"跑到一半关机了，第二天继续"

**用户故事**：我跑了 find 和 read 两个阶段后下班关机了。第二天回来，不想从头开始，希望从断点继续。

```yaml
前提:
  任务: "测试断点续跑"
操作:
  - orchestrator1.start(任务)
  - orchestrator1.executeCurrentPhase(分析参数)   # find 阶段
  - orchestrator1.proceedToNextPhase()             # → read 阶段
  - orchestrator1.executeCurrentPhase(分析参数)   # read 阶段
  - orchestrator1.checkpoint()                     # 保存检查点
  - # 模拟重启：新建一个 orchestrator 实例
  - orchestrator2 = new WorkflowOrchestrator()
  - orchestrator2.resume(原来的工作流ID)
  - orchestrator2.executeCurrentPhase(分析参数)   # link 阶段
  - orchestrator2.proceedToNextPhase()             # → show 阶段
  - orchestrator2.executeCurrentPhase(分析参数)   # show 阶段
期待结果:
  - 恢复后任务描述 === "测试断点续跑"
  - 恢复后当前阶段 === 'link'（从断点继续）
  - 恢复后产物中有 find 阶段结果 ✅
  - 恢复后产物中有 read 阶段结果 ✅
  - 恢复后产物中没有 link 阶段结果（还没执行）
  - 继续执行后当前阶段 === 'show'
  - 继续执行后产物中有 link 阶段结果 ✅
```

**具体示例**：

```
第一天:
  用户输入:  codemap workflow start "修复支付 Bug"
  系统执行:
    find 阶段 → 找到 3 个文件 → 保存到 .mycodemap/workflow/find.json
    read 阶段 → 分析影响范围 → 保存到 .mycodemap/workflow/read.json
  用户关机

第二天:
  用户输入:  codemap workflow resume wf-1745000000-abc1234

  系统恢复:
    从 .mycodemap/workflow/ 读取保存的状态:
      任务描述: "修复支付 Bug"        ← 还在 ✅
      当前阶段: link                  ← 从这里继续 ✅
      find 产物: [3个文件]            ← 还在 ✅
      read 产物: [影响范围]           ← 还在 ✅
      link 产物: 无                   ← 还没跑，正确 ✅

  继续执行:
    link 阶段 → 关联依赖 → 保存到 .mycodemap/workflow/link.json
    show 阶段 → 展示报告 → 完成
```

---

### E2E-004: 模板推荐——"不同任务用不同套路"

**用户故事**：我输入不同的任务描述，系统应该自动推荐合适的分析模板。紧急修复和功能开发的节奏完全不同。

```yaml
测试数据:
  - 输入: "fix login bug"
    期待模板: bugfix
    期待 find 门槛: 0.2

  - 输入: "add user profile feature"
    期待模板: feature
    期待 find 门槛: 0.4

  - 输入: "refactor payment module"
    期待模板: refactoring
    期待 find 门槛: 0.3

  - 输入: "urgent critical hotfix security"
    期待模板: hotfix
    期待 find 门槛: 0.1

  - 输入: "随便看看"
    期待模板: refactoring（默认兜底）
    期待 find 门槛: 0.3

额外验证:
  - 所有内置模板的 find 门槛各不相同（每个模板严格程度不同）
```

**具体示例**：

```
输入 "fix login bug":
  系统看到 "fix" + "bug" → 推荐 bugfix 模板
  bugfix 各阶段门槛: find=0.2, read=0.3, link=0.25, show=0.15
  → 比默认宽松，适合快速定位问题

输入 "add user profile feature":
  系统看到 "add" + "feature" → 推荐 feature 模板
  feature 各阶段门槛: find=0.4, read=0.5, link=0.4, show=0.25
  → 比默认严格，确保新功能分析全面

输入 "urgent critical hotfix security":
  系统看到 "urgent" + "hotfix" → 推荐 hotfix 模板
  hotfix 各阶段门槛: find=0.1, read=0.2, link=0.2, show=0.1
  → 最宽松，紧急情况不等分析完就往下推

输入 "随便看看":
  没有匹配关键词 → 兜底用 refactoring 模板
  refactoring 各阶段门槛: find=0.3, read=0.4, link=0.35, show=0.2
```

---

### E2E-005: 大项目性能——"1000 个文件会不会卡死？"

**用户故事**：我在一个有上千个文件的大型 monorepo 中运行 CodeMap，担心分析跑不动或者结果太多看不过来。

```yaml
前提:
  mock 结果: 1000 条 UnifiedResult
  topK: 8
操作:
  - orchestrator.start("大项目分析")
  - orchestrator.executeCurrentPhase({ ...分析参数, topK: 8 })
期待结果:
  - 阶段结果数量 ≤ 8（被 topK 截断）
  - 执行时间 < 1000 毫秒
  - 4 个阶段各 100 条结果累积后:
    - 累积上下文大小 ≤ 8 × 4（被 topK 控制住，不会无限膨胀）
    - 阶段结果数量 === 4（每个阶段都有）
    - 无内存泄漏迹象
```

**具体示例**：

```
用户在 1000 个文件的项目中运行:
  find 阶段 → 搜索返回 1000 条结果
    topK=8 截断 → 只保留最相关的 8 条:
      src/auth.ts       0.95
      src/payment.ts    0.91
      src/checkout.ts   0.88
      ... (共 8 条)

  read 阶段 → 又返回 100 条结果
    topK=8 截断 → 只保留 8 条
    和 find 的 8 条合并去重 → 累积上下文最多 16 条

  link 阶段 → 又返回 100 条
    topK=8 截断 → 累积上下文最多 24 条

  show 阶段 → 又返回 100 条
    topK=8 截断 → 累积上下文最多 32 条

  整个过程 < 1 秒，不会因为项目大就卡死
```

---

### E2E-006: 低置信度阻止推进——"分析质量差就别往下走了"

**用户故事**：我输入了一个很模糊的任务描述，find 阶段只找到 1 个不太相关的结果。系统应该告诉我"分析质量不够，建议补充信息"，而不是默默往下跑出垃圾结果。

```yaml
前提:
  任务: "模糊任务描述"
  mock 结果: 1 条，相关度只有 0.1
操作:
  - orchestrator.start(任务)
  - orchestrator.executeCurrentPhase(分析参数)   # find 阶段，返回低质量结果
  - validation = WorkflowContextValidator.canProceed(上下文)
  - guidance = orchestrator.getGuidance(置信度, 'find')
期待结果:
  - 如果置信度分数 < 0.3（find 门槛）:
    - canProceed.valid === false（阶段还没以足够质量完成）
  - guidance.action === 'hold'（建议暂停）
  - guidance.message 中包含置信度分数
  - 不带 force 调用 proceedToNextPhase() → 抛错
  - 带 force 调用 proceedToNextPhase(true) → 成功（强制推进）
```

**具体示例**：

```
用户输入:  codemap workflow start "看看代码"

find 阶段执行:
  搜索 "看看代码" → 只找到 1 个文件，相关度 0.1
  置信度 = 0.15（很低）

系统判断:
  canProceed.valid = false
    原因: "当前阶段 find 未完成 (状态: pending)"

  guidance = {
    action: 'hold',                    ← 建议暂停
    message: 'Low confidence (0.15), current phase needs more work',
    suggestion: 'insufficient results' ← 建议补充搜索范围
  }

用户选择:
  方案A: 补充任务描述，重新分析
  方案B: 强制推进 proceedToNextPhase(true) → 跳过检查，继续下一阶段
    （虽然可以强制，但结果质量可能不好）
```

---

### E2E-007: 自定义模板——"内置模板都不合适，我要自己的"

**用户故事**：我们团队做安全审计，需要比 feature 更严格的门槛（find 要 0.5 才继续），内置模板都不合适，我要自定义一个。

```yaml
前提:
  自定义模板:
    名称: "team-security-audit"
    类型: "custom"
    阶段配置:
      - find: 最低置信度 = 0.5
      - read: 最低置信度 = 0.6
      - link: 最低置信度 = 0.5
      - show: 最低置信度 = 0.3
操作:
  - templateManager.saveTemplate(自定义模板)
  - orchestrator.start("security audit", { template: "team-security-audit" })
  - phaseDefs = orchestrator.getAllPhaseDefinitions()
期待结果:
  - find 阶段最低置信度 === 0.5（自定义值生效）
  - read 阶段最低置信度 === 0.6（自定义值生效）
  - 上下文中模板名 === "team-security-audit"
  - 工作流按自定义阈值完整跑通

额外验证:
  - 不加 overwrite 标志尝试覆盖内置模板 → 报错 "Cannot overwrite builtin template"
```

**具体示例**：

```
团队创建自定义模板:
  templateManager.saveTemplate({
    name: "team-security-audit",
    phases: [
      find:  minConfidence=0.5  ← 比内置的都严格
      read:  minConfidence=0.6  ← 最严格
      link:  minConfidence=0.5
      show:  minConfidence=0.3
    ]
  })

使用自定义模板:
  codemap workflow start "security audit" --template team-security-audit

  find 阶段执行:
    搜索 "security" → 找到 5 个文件
    置信度 0.55 > 门槛 0.5 ✅ 可以继续

    （如果用默认 refactoring 模板，门槛只有 0.3，
     置信度 0.3~0.5 的低质量结果也会放行，
     对安全审计来说太宽松了）

  read 阶段执行:
    置信度 0.65 > 门槛 0.6 ✅ 可以继续

保护机制:
  尝试覆盖内置模板 → 报错！
  "Cannot overwrite builtin template: refactoring"
  必须加 overwrite: true 才能覆盖
```

---

## 实现备注

- **测试隔离**：每个测试创建临时目录和新的 `WorkflowOrchestrator` 实例
- **Mock 策略**：Mock `ToolOrchestrator.executeParallel` 返回受控结果；**不** Mock `ResultFusion` 或 `PhaseInheritance`
- **真实集成**：`WorkflowPersistence`、`WorkflowContextFactory`、`WorkflowContextValidator` 必须用真实实例
- **阶段名称**：使用当前代码的 4 阶段模型：`find → read → link → show`（不是旧的 6 阶段模型）
- **置信度**：尽量使用真实的 `calculateConfidence()`；只在结果为合成数据时才 Mock