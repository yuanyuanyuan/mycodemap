# 2026-04-17 eatdogfood：CodeMap CLI 项目内自试用记录

## 1. 任务定义

- [证据] **目标**：以真实使用者（eatdogfood）的身份，在当前仓库里直接使用项目自己的 CLI 做一次最小闭环试用，覆盖 `generate`、`query`、`analyze`、`deps`、`impact`，并记录体验、失败模式与后续建议。公开命令面与 AI/Agent 的推荐入口已在 `README.md:10`、`README.md:11`、`README.md:25`、`README.md:28`、`AI_GUIDE.md:47`、`AI_GUIDE.md:49`、`AI_GUIDE.md:51`、`AI_GUIDE.md:52`、`AI_GUIDE.md:54` 说明。
- [证据] **限制条件**：当前仓库的默认配置只扫描 `src/**/*.ts`，排除 `dist/**`、`build/**`、测试文件，输出目录为 `.mycodemap`，因此本次 dogfood 以源码主干为主，不把构建产物视为正常分析对象。见 `mycodemap.config.json:3`、`mycodemap.config.json:4`、`mycodemap.config.json:7`、`mycodemap.config.json:8`、`mycodemap.config.json:9`、`mycodemap.config.json:10`、`mycodemap.config.json:12`。
- [证据] **验收标准**：至少形成一次“生成 → 查询 → 阅读 → 依赖 → 影响”的真实操作链；至少记录一个失败场景；结果落到 `docs/exec-plans/` 以满足“目标、限制、DoD、风险、复盘”边界。目录职责见 `docs/exec-plans/README.md:3`、`docs/exec-plans/README.md:7`、`docs/exec-plans/README.md:8`、`docs/exec-plans/README.md:22`、`docs/exec-plans/README.md:23`、`docs/exec-plans/README.md:24`。
- [证据] **依赖关系**：本仓库 `bin` 已指向 `dist/cli/index.js`，且 `build` 脚本为 `tsc`，说明可以直接基于已构建 CLI 运行体验测试。见 `package.json:15`、`package.json:16`、`package.json:17`、`package.json:29`、`package.json:30`。

## 2. 操作过程

### 2.1 入口确认

- [证据] 先用 `node dist/cli/index.js --help` 确认当前公共命令，结果与 README/AI 指南一致：存在 `generate`、`query`、`deps`、`impact`、`analyze` 等入口；这与 `README.md:10`、`README.md:28`、`docs/ai-guide/COMMANDS.md:12`、`docs/ai-guide/COMMANDS.md:46`、`docs/ai-guide/COMMANDS.md:74`、`docs/ai-guide/COMMANDS.md:91` 一致。
- [观点] 这一步体验是“入口比较完整，但用户需要自己决定该先用 `query` 还是 `analyze`”；对于第一次上手的人，命令多不一定是优势。

### 2.2 生成代码地图

- [证据] 执行命令：`rtk node dist/cli/index.js generate`
- [证据] 实际输出显示：扫描 242 个文件、62482 行代码、242 个模块、958 个导出符号，并写出 `AI_MAP.md`、`codemap.json`、`dependency-graph.md` 与 `context/`。
- [推论] 这一步与文档承诺基本一致：README 明确把 `generate` 作为第一步，并说明输出 `.mycodemap/AI_MAP.md`、`codemap.json`、`dependency-graph.md` 等文件，见 `README.md:58`、`README.md:59`、`README.md:61`、`README.md:62`、`README.md:66`、`README.md:67`；命令参考也把 `.mycodemap` 作为默认输出目录，见 `docs/ai-guide/COMMANDS.md:15`、`docs/ai-guide/COMMANDS.md:25`。
- [观点] 这一步是本次体验里“最稳”的一环：执行路径短、反馈明确、产物可见，能快速建立信心。

### 2.3 符号与模块查询

- [证据] 执行命令：`node dist/cli/index.js query --search CodeMapServer --limit 5 --json --structured`
- [证据] 返回 3 个结果：`src/server/CodeMapServer.ts` 模块、`CodeMapServer` 类导出、`src/server/index.ts` 里的 `CodeMapServer` 变量导出。
- [证据] 执行命令：`node dist/cli/index.js query --search SourceLocation --limit 10 --json --structured`
- [证据] 返回 1 个结果：`src/interface/types/index.ts` 中导出的 `SourceLocation` 接口。
- [推论] `query` 基本符合 AI 指南里“查定义/查相关代码”的定位：`query -s "XXX"` 用于找定义，`query -S "XXX"` 用于模糊检索，见 `AI_GUIDE.md:50`、`AI_GUIDE.md:54`、`docs/ai-guide/COMMANDS.md:49`、`docs/ai-guide/COMMANDS.md:52`、`docs/ai-guide/COMMANDS.md:65`、`docs/ai-guide/COMMANDS.md:66`。
- [观点] 如果我是第一次接触项目的 agent，我会优先保留 `query`，因为它给我的“是否找到了东西”的反馈最直接。

### 2.4 read / link / show

- [证据] 执行命令：`node dist/cli/index.js analyze -i read -t src/server/CodeMapServer.ts --scope direct --include-git-history --json --structured`
- [证据] 返回 `confidence.score = 0.8`、`level = high`、`results.length = 7`。
- [证据] 执行命令：`node dist/cli/index.js analyze -i read -t src/interface/types/index.ts --scope direct --json --structured`
- [证据] 返回 `confidence.score = 0.8`、`results.length = 8`。
- [证据] 执行命令：`node dist/cli/index.js analyze -i link -t src/server --json --structured`
- [证据] 返回 `confidence.score = 0.6`、`level = medium`、`resultCount = 2`。
- [证据] 执行命令：`node dist/cli/index.js analyze -i show -t src/server --output-mode human`
- [证据] 人类输出中直接给出 `src/server/CodeMapServer.ts:1`，并提示“导出 1 个符号，依赖 11 个模块，相关度 75.0%”。
- [推论] `analyze` 的 `read/show` 路径能跑通，且与 README 中“`analyze` 支持 human/machine 模式”的承诺一致，见 `README.md:25`、`README.md:74`、`README.md:75`、`docs/ai-guide/COMMANDS.md:6`。
- [观点] `show` 的人类输出有“开箱即看”的味道，比结构化 JSON 更像产品；但它的 discoverability 仍然依赖文档，不是 CLI 自解释。

### 2.5 deps / impact

- [证据] 执行命令：`node dist/cli/index.js deps -m src/server/CodeMapServer.ts --json --structured`
- [证据] 返回结果显示：`src/server/CodeMapServer.ts` 直接依赖 11 个模块，前 5 个外部依赖是 `hono`、`@hono/node-server`、`hono/cors`、`hono/logger`、`hono/pretty-json`。
- [证据] 执行命令：`node dist/cli/index.js impact -f src/server/CodeMapServer.ts --transitive --json --structured`
- [证据] 返回结果显示：直接影响 6 个依赖方，统计字段中传递影响规模为 217。
- [推论] 这与 AI 指南中“依赖看 `deps`、影响看 `impact -t -j`”的建议一致，见 `AI_GUIDE.md:51`、`AI_GUIDE.md:52`、`docs/ai-guide/COMMANDS.md:74`、`docs/ai-guide/COMMANDS.md:91`、`docs/ai-guide/COMMANDS.md:95`、`docs/ai-guide/COMMANDS.md:101`。
- [观点] 这一步很像真实开发者决策前的“最后一跳”：如果我要改 `CodeMapServer`，这两个命令能快速告诉我“依赖谁”和“谁会被我炸到”。

## 3. 失败预演与实际失败案例

### 3.1 实际失败案例：`analyze -i find` 失准

- [证据] 执行命令：`node dist/cli/index.js analyze -i find -k SourceLocation --json --structured`
- [证据] 标准输出返回：`confidence.score = 0.04`、`level = low`、`resultCount = 0`。
- [证据] 同一次执行的标准错误包含 `ast-grep scan 命令失败: SyntaxError`，错误内容直接打印了 TypeScript 语法（例如 `filePath: string`、`Promise<string>` 等），说明底层扫描器在解析 TS 文件时发生失败。
- [证据] 对照组 1：`rtk grep 'SourceLocation' src tests docs --glob '!dist/**' --glob '!node_modules/**'` 能在 10 个文件里找到 37 处匹配。
- [证据] 对照组 2：`node dist/cli/index.js query --search SourceLocation --limit 10 --json --structured` 能稳定返回 `src/interface/types/index.ts` 中的 `SourceLocation`。
- [推论] 这不是“仓库里没有该符号”，而是 `analyze find` 的实现/回退链有缺口：同一个关键词，基础文本检索与 `query` 都能命中，唯独 `analyze find` 在报扫描错误后给出空结果。
- [观点] 这是本次 dogfood 最大的问题：它会让用户误以为“没有结果”，而不是“工具在部分路径上坏了”。

### 3.2 风险模式

- [推论] 风险模式 1：**静默降级**。命令虽然打印了 stderr，但仍然返回结构化空结果；如果调用方只读 stdout，就会把失败误判成“安全的 0 命中”。
- [推论] 风险模式 2：**命令选择误导**。`AI_GUIDE.md:54` 把“查找与 XXX 相关的代码”推荐为 `query -S "XXX" -j`，这次反而证明它比 `analyze -i find` 更可靠；若未来文档把 find/promoted workflow 放在更前面，可能会扩大误导面。
- [推论] 风险模式 3：**配置与实现不一致**。`mycodemap.config.json:7`、`mycodemap.config.json:8` 明确排除了 `dist/**`、`build/**`，但扫描错误里出现了对不兼容语法的解析失败，说明 analyze 链路可能没有完全复用 generate/query 那套“配置感知 + 忽略规则”。

## 4. 心得和感受

- [观点] **好感点**：`generate`、`query`、`deps`、`impact` 组合起来，已经足以支持“先建图、再定位、再评估改动范围”的真实工作流；对 agent 很实用。
- [观点] **不满点**：`analyze` 想做统一入口，但当前可靠性不如专用命令；这让“统一入口”变成概念上更高级、实际体验上更脆弱。
- [观点] **对立面质疑**：如果产品前提是“让 AI/Agent 通过统一结构化入口稳定拿到代码上下文”，那 `find` 返回空且不 hard fail 就已经触碰产品底线；这不是小瑕疵，而是信任问题。
- [观点] **作为 eatdogfood 的主观感受**：我愿意继续用这个工具，但会形成一个保守习惯——先用 `generate + query`，把 `analyze find` 当成实验功能，而不是主路径。

## 5. 结论与建议

- [推论] **短期建议**：把 `query -S` 继续作为默认查找路径，对 `analyze -i find` 增加显式失败状态或 warning 升级，避免“空结果伪装成功”。
- [推论] **中期建议**：检查 `analyze` 是否复用了与 `generate/query` 一致的 include/exclude 与 TypeScript 解析策略，优先消除“配置写了排除、实际扫描没排除”的偏差。
- [推论] **长期建议**：让 `analyze` 只做 orchestration，不再偷偷切到不稳定的底层扫描器；或者至少在 JSON 结果里暴露 `partialFailure` 字段。

## 6. 文档同步判断

- [证据] 本次没有修改 CLI 契约、配置项、输出格式、架构边界，因此不触发 README / AI_GUIDE / COMMANDS / OUTPUT 的强制同步条件；触发条件定义见 `AGENTS.md:151`、`AGENTS.md:152`、`AGENTS.md:153`、`AGENTS.md:158`、`AGENTS.md:160`。
- [证据] 本次新增的是执行复盘与缺陷记录，符合 `docs/exec-plans/` 与 `.codemap/issues/` 的用途，不属于产品文档失真修复。

## 7. 本次使用的命令清单

- [证据] `rtk node dist/cli/index.js generate`
- [证据] `node dist/cli/index.js query --search CodeMapServer --limit 5 --json --structured`
- [证据] `node dist/cli/index.js query --search SourceLocation --limit 10 --json --structured`
- [证据] `node dist/cli/index.js analyze -i read -t src/server/CodeMapServer.ts --scope direct --include-git-history --json --structured`
- [证据] `node dist/cli/index.js analyze -i read -t src/interface/types/index.ts --scope direct --json --structured`
- [证据] `node dist/cli/index.js analyze -i link -t src/server --json --structured`
- [证据] `node dist/cli/index.js analyze -i show -t src/server --output-mode human`
- [证据] `node dist/cli/index.js deps -m src/server/CodeMapServer.ts --json --structured`
- [证据] `node dist/cli/index.js impact -f src/server/CodeMapServer.ts --transitive --json --structured`
- [证据] `node dist/cli/index.js analyze -i find -k SourceLocation --json --structured`
- [证据] `rtk grep 'SourceLocation' src tests docs --glob '!dist/**' --glob '!node_modules/**'`
