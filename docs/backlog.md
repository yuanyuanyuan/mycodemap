

# mycodemap 产品重塑提案 v0.6
**从"代码地图工具"到"架构契约治理引擎"**

## 一、战略定位重置（Positioning）

### 核心定位转变
| 维度 | 当前（v0.5 MVP3） | **重塑后（v0.6）** |
|------|------------------|-------------------|
| **产品品类** | TypeScript 代码地图生成工具 | **架构契约验证与护栏系统** |
| **核心价值** | 帮助AI理解代码结构 | **防止AI/人类破坏架构边界** |
| **竞争差异** | 生成 JSON 地图供AI消费 | **生成决策：通过/阻断，并给出架构违反证据** |
| **技术重心** | Tree-sitter 解析 + 图数据库 | **Tree-sitter + SQLite + 轻量内存图** |

---

## 二、只做（Must Do）- 差异化护城河

### 1. **契约护栏系统（Contract Barriers）**
基于 `mycodemap.design.md` 的强约束验证：
- **模块边界守护**：验证跨模块调用是否通过允许的中介
- **依赖方向检查**：确保分层架构（如领域层→基础设施层）不被反向依赖
- ** breaking change 预警**：当修改影响契约定义的公开 API 时自动标记

```typescript
// 新命令示例
mycodemap verify --contract design.md --against src/
// 输出: { "passed": false, "violations": [{ "rule": "auth禁止直接调用payment", "location": "auth/login.ts:45" }] }
```

### 2. **Git 历史融合分析（Code Archaeology）**
利用 SQLite 存储 git blame + 变更历史：
- **危险区域标记**：高频修改且伴随回滚的代码区域自动标记"高风险"
- **契约漂移检测**：对比当前代码与历史契约版本，发现架构腐化趋势
- **影响评估增强**：不仅告诉AI"这修改影响3个文件"，还告诉"这3个文件在过去6个月被修改了17次，回滚率35%"

### 3. **轻量级混合存储架构**
**放弃重型图数据库**，采用 SQLite + 内存图计算：

```typescript
// 技术架构示意
StorageLayer {
  // Layer 1: SQLite 负责持久化 + BM25全文搜索 + 契约元数据
  sqlite: BetterSQLite3Wrapper;
  
  // Layer 2: 内存图计算（替代 NetworkX，使用 graphlib 或自研邻接表）
  graph: DirectedGraph; // 基于 Map/Set 的轻量实现
  
  // 启动时从 SQLite 加载符号关系到内存图，<500ms
  loadGraph(): void;
  
  // 核心操作：基于图的可达性分析（契约验证的关键）
  computeImpact(symbol: string, depth: number): ImpactGraph;
}
```

**为什么这个架构对 TypeScript 项目更优：**
- `better-sqlite3`：Node.js 最快的 SQLite 绑定，零配置，单文件存储
- 内存图计算：对于 <50K 文件的 TypeScript 项目，纯 JavaScript 图遍历（DFS/BFS）性能足够（<100ms），无需引入沉重的图数据库客户端

### 4. **CI/CD 原生集成（Quality Gate）**
专为流水线设计的"硬阻断"模式：
- **退出码策略**：发现契约违反时返回非零退出码，直接阻断 CI 流程
- **JSON 报告**：生成结构化报告供 GitHub/GitLab 的 Code Review 界面渲染
- **增量验证**：仅验证 git diff 涉及的符号，<2秒完成门禁检查

---

## 三、不做（Must Not Do）- 避免与巨人正面竞争

### 1. **不追求极致的 Token 节省**
- **不做**：与 code-review-graph 竞争的"49倍Token节省"宣传
- **原因**：这是 code-review-graph 的核心赛道，且需要极其优化的增量算法和向量索引，投入产出比低
- **替代**：专注"**精准上下文**"——不是给AI更少代码，而是给AI**符合架构约束**的代码上下文

### 2. **不做动态运行时分析**
- **不做**：eBPF 插桩、JavaScript 运行时追踪、调用链路采集
- **原因**： 
  - 技术债务极重（需维护运行时 agent）
  - 与静态分析工具定位冲突（用户不会同时安装两类工具）
  - 报告中提到的"运行时图谱"目前仍是学术阶段，无成熟开源方案

### 3. **不做多模态支持（文档/图像/音频）**
- **不做**：解析 PDF 架构图、会议录音转录、白板照片识别
- **原因**：这是 graphify 的独占赛道，需集成 Whisper/OCR/LLM，架构重量与 mycodemap 的"轻量CLI"定位冲突

### 4. **不做通用代码搜索引擎**
- **不做**：支持 25 种语言的通用符号搜索、跨语言调用图
- **原因**：竞品已覆盖（code-review-graph 支持 23 种语言，graphify 25 种）
- **专注**：TypeScript/JavaScript 生态的**深度架构治理**，而非广度语言支持

---

## 四、优化方向（Optimization Roadmap）

### Phase 1: 架构瘦身（v0.6.0）
- **移除**：KuzuDB 依赖（如果当前有）
- **引入**：better-sqlite3 + 内存图结构（基于 Map 的邻接表）
- **基准**：10K 文件项目启动时间 <1s，内存占用 <200MB

### Phase 2: 契约系统硬化（v0.7.0）
- **设计契约 Schema 标准化**：`design.md` → JSON Schema 验证
- **护栏规则引擎**：支持复杂度、依赖方向、模块边界三类规则
- **Git 融合**：SQLite 存储 git blame 信息，支持 `mycodemap history --symbol X` 查询变更轨迹

### Phase 3: AI 协作协议（v0.8.0）
- **MCP 工具增强**：从"提供上下文"转向"提供决策建议"
  - 新增 `verify_contract` MCP 工具：AI 在修改前调用，获取"此修改是否安全"的布尔值
- **Prompt 模板**：为 Claude Code/Cursor 提供"架构师模式"提示词，强制在修改前调用 mycodemap verify

---

## 五、用户场景（User Scenarios）

### 场景 A：架构师的守门员（Quality Gate）
**角色**：资深工程师/架构师  
**痛点**： junior 开发或 AI 工具经常破坏精心设计的模块边界  
**使用**：
```bash
# 在 pre-commit 钩子中
mycodemap verify --strict --fail-on-barrier-break
```
**价值**：将架构文档（design.md）从"仅供参考"变为"强制执行的代码法律"

### 场景 B：AI 辅助开发的安全护栏
**角色**：使用 Claude Code/Cursor 的开发者  
**痛点**：AI 经常生成"看似正确但破坏架构"的代码（如直接跨层调用数据库）  
**使用**：
```typescript
// .cursorrules 或 claude.md 配置
"Before modifying code, run: mycodemap impact -t {target} --check-contracts"
```
**价值**：AI 在每次修改前自动检查，避免" AI 写代码，架构师擦屁股"的循环

### 场景 C：遗留项目现代化评估
**角色**：技术负责人  
**痛点**：不知道当前代码与最初架构设计偏离了多远  
**使用**：
```bash
mycodemap drift --since 2024-01-01 --contract original-design.md
```
**价值**：量化"架构腐化度"，为重构决策提供数据支撑（如"当前 23% 的调用违反了原始模块边界"）

### 场景 D：高风险修改预警
**角色**：DevOps/运维  
**痛点**：某些代码区域变更极易引发故障  
**使用**：
```bash
mycodemap analyze -i modify -t "payment/" --include-history --json
# 输出标记：该区域过去 12 个月修改 47 次，回滚 12 次，事故 3 次
```
**价值**：在变更发布前识别"代码墓地"区域，强制增加 review 层级

---

## 六、竞品差异化对比表

| 功能维度 | code-review-graph | graphify | **mycodemap (重塑后)** |
|---------|-------------------|----------|----------------------|
| **核心问题** | "哪些代码可能相关" | "这段代码的设计动机是什么" | **"这次修改是否破坏架构规则"** |
| **输出形态** | 文件列表 + 置信度 | 自然语言解释 + 多模态关联 | **布尔值（通过/阻断）+ 违规证据链** |
| **存储架构** | SQLite (极致性能) | SHA256缓存 + 大模型语义 | **SQLite + 内存图（轻量可移植）** |
| **最佳场景** | 日常编码辅助 | 理解遗留项目 | **CI/CD 门禁 + 架构守护** |
| **与AI关系** | AI 的"眼"（提供上下文） | AI 的"脑"（提供理解） | **AI 的"护栏"（提供约束）** |

---

## 七、总结

mycodemap 的救赎之路是**放弃成为更好的"代码搜索引擎"，转而成为唯一的"架构契约执行引擎"**：

- **不做** code-review-graph 能做到的事（快速搜索、Token节省）
- **不做** graphify 能做到的事（多模态理解、设计动机提取）
- **只做** 它们都做不到的事：**将架构文档转化为可执行的代码法律，并在 CI/CD 中强制执行**

这是从"工具"到"基础设施"的跃迁——不是让AI更方便地写代码，而是**确保AI写的代码不会破坏你的架构**。