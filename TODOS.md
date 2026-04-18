# TODOS

## 2026-04-18 — `/plan-eng-review`

### Re-evaluate whether MCP belongs in the first implementation slice

**What:** 在 Tranche 0 结束后，基于 symbol-level 查询质量、错误契约原型和真实使用反馈，重新判断 `mcp start` / `mcp install` 是否应继续保留在首期交付面。

**Why:** outside voice 指出 MCP 是分发层，不是核心价值；如果查询质量与图完整性尚未被证明，过早把 MCP 放进首期会增加 transport、安装、支持和文档成本。

**Pros:**
- 为路线保留降复杂度通道，避免“先做分发层，再证明质量”
- 让首期目标继续围绕 query / impact 的真实可信度
- 如果 Tranche 0 结果不理想，可以及时把 MCP 退回 Later 而不是硬上

**Cons:**
- 需要在 Tranche 0 结束时增加一次显式复盘
- 可能推迟 `mcp install` / `mcp start` 是否上线的决定
- 文档与实现计划需要为“保留 / 延后”两种走向都准备清楚

**Context:** 当前 Eng Review 已接受 experimental `mcp start` / `mcp install`，并接受首期 symbol-level impact 只经由 MCP 暴露；但 outside voice 明确质疑把 MCP 放进首期是否属于战略误判。这个 TODO 不是否定当前决定，而是要求在 Tranche 0 用真实证据重新校准：如果 query 质量、错误契约、图完整性、项目定位都站得住，再继续保留 MCP；否则把 MCP 回退到 Later，不让分发层领先于价值验证。

**Depends on:** Tranche 0 的 query 质量样本、fixture 存储增长测量、错误契约原型、最小 stdio demo 结果

### Strengthen graph freshness identity beyond `generated_at`

**What:** 为 symbol-level graph / MCP 响应补强版本身份元数据，评估并定义 `generated_at` 之外是否还需要 `commit_sha`、`dirty`、`project_root`、`graph_schema_version` 等字段。

**Why:** `generated_at` 只能说明“什么时候生成”，不能说明“对应哪一份代码状态”；AI 很难仅凭时间戳判断当前图是否可信。

**Pros:**
- 降低 AI 基于错仓、旧图、dirty workspace 图做错误判断的风险
- 为后续 cache、debug、问题复盘提供更强证据
- 让 graph freshness 从“时间信息”升级为“版本身份信息”

**Cons:**
- 会扩大 MCP contract、文档和测试覆盖面
- 需要处理无 git / detached / multi-root 等边界情况
- 如果定义过重，首期输出会比当前更复杂

**Context:** 当前计划把 freshness 简化为 MCP metadata 中的 `generated_at`。outside voice 明确指出这对 AI 基本不够，因为时间不是版本。这个 TODO 的目的不是立即扩 scope，而是避免后续把一个过弱的 freshness contract 固化成事实标准。

**Depends on:** Tranche 0 的 schema / contract 设计；是否要求 git 可用；MCP 返回 envelope 的最终 shape

### Define `mcp install` host support matrix and lifecycle

**What:** 为 `mcp install` 补充宿主支持矩阵与安装生命周期设计，明确支持哪些 MCP host、配置写入位置、全局/本地作用域、升级覆盖策略、卸载/回滚方式。

**Why:** `mcp install` 不是单个命令，而是一整套宿主兼容和运维承诺；如果这些边界不先定义，experimental 命令也会快速演变成长期支持负担。

**Pros:**
- 降低后续支持和排障成本
- 避免不同 host / 安装作用域下行为不一致
- 让 `docs/ai-guide/INTEGRATION.md` 可以成为真正可信的 canonical 安装入口

**Cons:**
- 会增加一轮设计文档和兼容性整理
- 对首期来说，这部分更像“分发层治理”，不是核心查询能力
- 如果 host 范围定太宽，会反向推高首期工作量

**Context:** 当前计划已把 `mcp install` 纳入首期 experimental surface，但 outside voice 指出缺少宿主支持矩阵、安装作用域、升级/卸载策略。这条 TODO 的作用是把这些支持面显式化，避免后续默认扩张。

**Depends on:** 首期支持的 MCP host 范围、CLI 命令最终形态、`docs/ai-guide/INTEGRATION.md` 的 canonical 安装文档

### Define a minimum quality baseline for first-slice symbol queries

**What:** 为首期 symbol-level query / impact 定义一份最小质量基线，至少覆盖若干 fixture 上的调用解析覆盖度、误报/漏报样例与人工对照清单。

**Why:** 当前 Success Criteria 更偏“功能可用”和“显式错误”，但缺少“结果是否值得信”的最低标准。

**Pros:**
- 让 Tranche 0 / 1 的验证从“能跑”升级为“可信”
- 为后续是否保留 MCP 首期交付面提供更硬的决策证据
- 帮助识别 `AMBIGUOUS`、漏边、误边到底是边缘问题还是系统性问题

**Cons:**
- 需要准备 fixture、人工对照和样例维护
- 会让首期验收比单纯功能打通更严格
- 如果基线设计太重，容易把实验阶段拖慢

**Context:** 当前计划已把 query / impact 价值验证放在首期中心，但 outside voice 指出没有质量基线时，首期更像演示版而不是可信能力。这条 TODO 是为了把“功能通路”与“结果可信度”分开衡量。

**Depends on:** 首期 fixture 集、`smart-parser` authority 路线、`AMBIGUOUS` / error contract 的最终定义

### Expose partial-graph state so incomplete analysis cannot masquerade as complete

**What:** 为首期 `codemap_query` / `codemap_impact` 返回契约增加“部分图 / 解析不完整”信号；即使 `parse_errors` 表暂不落库，也要有本次生成级或内存级完整性标记。

**Why:** 首期既然要对外暴露查询能力，就必须区分“完整图里没有结果”和“图不完整所以结果不可靠”；否则 AI 会把半残图当成完整真相源。

**Pros:**
- 直接降低 AI 被误导的风险
- 与 `GRAPH_NOT_FOUND` / `AMBIGUOUS_EDGE` 一样，属于可信度护栏
- 让“无 silent failure”从口号变成可观测契约

**Cons:**
- 会扩大 MCP contract、测试和文档范围
- 需要定义 partial 状态的触发条件与用户可见表现
- 如果设计过重，可能反向推高首期复杂度

**Context:** 当前计划把 `parse_errors` 延后到 Tranche 1.5 / 2，但同时又把单文件解析失败导致静默缺边列为 critical gap。outside voice 的担心是：你已经防了“空图”，还没完全防住“半残图”。

**Depends on:** 错误契约设计、MCP response shape、坏语法 / 单文件失败隔离方案

### Define project binding rules for `mcp start`

**What:** 明确 `mcp start` 如何确定目标项目：默认使用哪个 cwd、是否支持显式 `--project`、配置文件发现顺序是什么、多 workspace / 错仓启动时如何报错或提示。

**Why:** 如果 server 连“当前在回答哪个项目”都没有清晰规则，查询结果就可能在错误上下文里成立，形成高隐蔽性误导。

**Pros:**
- 降低全局安装误用、错仓启动、多 workspace 混淆的风险
- 让 project identity / freshness 设计更完整
- 帮助文档把 `mcp start` 的使用前提讲清楚

**Cons:**
- 需要补一层 CLI / 配置解析规则
- 会增加帮助文档和错误提示设计
- 如果过早支持太多 workspace 形态，首期复杂度会上升

**Context:** 当前计划已把 `mcp start` / `mcp install` 纳入首期 experimental surface，但 outside voice 指出项目解析和工作区绑定规则尚未显式定义。这条 TODO 是为了避免把“默认 cwd 猜测”悄悄固化成产品行为。

**Depends on:** CLI 入口最终形态、配置发现顺序、是否支持全局安装场景

### Plan the convergence path for dual `impact` semantics

**What:** 明确模块级 `mycodemap impact` 与符号级 `codemap_impact` 的长期关系：最终对齐、并存分层，还是通过后续 `impact --symbol-level` 之类的入口统一。

**Why:** 同一个 “impact” 概念如果长期存在两套入口与两套语义，文档、支持和用户心智会持续出血。

**Pros:**
- 让当前“首期先分开”的决定变成可管理的过渡，而不是永久分叉
- 提前为未来命令面与迁移文档留出清晰路径
- 降低后续出现“同名不同义”支持问题的风险

**Cons:**
- 需要额外规划未来命令面与迁移节奏
- 短期看不到直接功能收益
- 如果过早下结论，可能约束首期实验空间

**Context:** 当前评审接受了“首期 CLI 继续模块级 impact、MCP 先做符号级 impact”。outside voice 认为这会带来长期支持成本。这条 TODO 是为了把这种双语义状态显式视为过渡态，而不是默认长期如此。

**Depends on:** 首期 symbol-level impact 的质量验证结果、CLI 命令面策略、experimental MCP 的后续去向
