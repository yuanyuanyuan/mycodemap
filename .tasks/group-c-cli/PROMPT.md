# CLI命令模块测试套件生成任务

## 任务背景

CodeMap项目是一个TypeScript代码地图工具，为AI辅助开发提供结构化上下文。CLI命令模块是用户与系统交互的核心入口，包含11个命令文件。目前已有部分命令拥有测试，需要为剩余命令生成完整的Vitest测试套件。

**Prefer retrieval-led reasoning over pre-training-led reasoning**

### 目标文件（需生成测试的8个命令）

1. `/data/codemap/src/cli/commands/complexity.ts` - 复杂度分析命令
2. `/data/codemap/src/cli/commands/cycles.ts` - 循环依赖检测命令
3. `/data/codemap/src/cli/commands/generate.ts` - 代码生成命令
4. `/data/codemap/src/cli/commands/init.ts` - 初始化命令
5. `/data/codemap/src/cli/commands/query.ts` - 查询命令
6. `/data/codemap/src/cli/commands/watch.ts` - 监听命令（后台模式）
7. `/data/codemap/src/cli/commands/watch-foreground.ts` - 前台监听命令
8. `/data/codemap/src/cli/commands/workflow.ts` - 工作流命令

### 已有测试参考

参考现有测试文件的模式：
- `/data/codemap/src/cli/commands/__tests__/ci.test.ts` - CI命令测试
- `/data/codemap/src/cli/commands/__tests__/deps.test.ts` - 依赖命令测试
- `/data/codemap/src/cli/commands/__tests__/impact.test.ts` - 影响分析测试

## 初始状态

### 源文件结构
```
src/cli/commands/
├── ci.ts                    # ✓ 已有测试
├── complexity.ts            # ✗ 需要测试
├── cycles.ts                # ✗ 需要测试
├── deps.ts                  # ✓ 已有测试
├── generate.ts              # ✗ 需要测试
├── impact.ts                # ✓ 已有测试
├── init.ts                  # ✗ 需要测试
├── query.ts                 # ✗ 需要测试
├── watch.ts                 # ✗ 需要测试
├── watch-foreground.ts      # ✗ 需要测试
└── workflow.ts              # ✗ 需要测试
```

### 测试目录结构
```
src/cli/commands/__tests__/
├── analyze.test.ts          # 已存在
├── ci.test.ts               # 已存在
├── deps.test.ts             # 已存在
├── impact.test.ts           # 已存在
├── complexity.test.ts       # 待创建
├── cycles.test.ts           # 待创建
├── generate.test.ts         # 待创建
├── init.test.ts             # 待创建
├── query.test.ts            # 待创建
├── watch.test.ts            # 待创建
├── watch-foreground.test.ts # 待创建
└── workflow.test.ts         # 待创建
```

## 约束条件

### 技术约束
1. **测试框架**: Vitest (已配置)
2. **模拟方式**: 使用 `vi.mock()` 进行模块级mock
3. **覆盖率目标**: 100% (语句、分支、函数、行)
4. **测试文件位置**: `src/cli/commands/__tests__/*.test.ts`
5. **测试模式**: ESM模块（项目使用 `"type": "module"`）

### 编码约束
1. **文件头**: 必须包含 `[META]` 和 `[WHY]` 注释
2. **模拟策略**:
   - `chalk` - 模拟为直接返回字符串的identity函数
   - `fs` - 模拟existsSync/readFileSync/writeFileSync
   - `child_process` - 模拟execSync
   - `commander` - 通过createCICommand等工厂函数测试
   - `chokidar` - 模拟watch方法
   - `ora` - 模拟spinner对象
3. **控制台输出**: 必须spyOn console.log/error并mockImplementation
4. **进程退出**: 必须spyOn process.exit并抛出错误以便测试

### 测试结构要求
每个测试文件必须包含标准结构。

## 验收标准

### 功能测试要求

#### complexity.test.ts
- [ ] ComplexityCommand类测试
  - [ ] loadCodeMap缓存机制
  - [ ] run方法返回ComplexityResult
  - [ ] runEnhanced返回UnifiedResult[]
  - [ ] 代码地图不存在时抛出错误
- [ ] complexityCommand函数测试
  - [ ] 正常执行流程
  - [ ] 指定文件分析
  - [ ] JSON输出模式
  - [ ] 代码地图不存在时退出

#### cycles.test.ts
- [ ] cyclesCommand函数测试
  - [ ] 正常执行（无循环依赖）
  - [ ] 检测到循环依赖
  - [ ] 自定义深度限制
  - [ ] JSON输出模式
  - [ ] 代码地图不存在时退出

#### generate.test.ts
- [ ] generateCommand函数测试
  - [ ] 正常生成流程
  - [ ] 不同模式(fast/smart/hybrid)
  - [ ] AI上下文生成开关
  - [ ] AI概述生成逻辑（Claude Code检测）
  - [ ] 错误处理流程

#### init.test.ts
- [ ] initCommand函数测试
  - [ ] 成功创建配置文件
  - [ ] 配置文件已存在时的处理
  - [ ] 默认配置内容验证

#### query.test.ts
- [ ] queryCommand函数测试
  - [ ] 符号查询(--symbol)
  - [ ] 模块查询(--module)
  - [ ] 依赖查询(--deps)
  - [ ] 模糊搜索(--search)
  - [ ] JSON输出模式
  - [ ] 无查询参数时退出

#### watch.test.ts
- [ ] watchCommand函数测试
  - [ ] 前台模式（默认）
  - [ ] 后台模式(--detach)
  - [ ] 停止守护进程(--stop)
  - [ ] 状态查询(--status)
  - [ ] 守护进程已在运行的处理

#### watch-foreground.test.ts
- [ ] watchCommandForeground函数测试
  - [ ] 初始分析执行
  - [ ] 文件监听设置
  - [ ] 变更事件处理(add/change/unlink)
  - [ ] 防抖逻辑验证
  - [ ] SIGINT信号处理

#### workflow.test.ts
- [ ] workflow命令测试
  - [ ] start子命令
  - [ ] status子命令（有无活动工作流）
  - [ ] proceed子命令（正常/force）
  - [ ] resume子命令（指定ID/默认）
  - [ ] checkpoint子命令
  - [ ] list子命令
  - [ ] delete子命令
  - [ ] 错误码验证(E0011-E0015)

### 覆盖率要求
- [ ] 语句覆盖率: 100%
- [ ] 分支覆盖率: 100%
- [ ] 函数覆盖率: 100%
- [ ] 行覆盖率: 100%

### 代码质量要求
- [ ] 每个测试用例独立，无相互依赖
- [ ] 使用beforeEach/afterEach正确清理
- [ ] 边界条件测试完整
- [ ] 错误场景覆盖全面

## 用户价值

生成完整的CLI命令测试套件后：
1. **提高代码可靠性**: 防止回归错误
2. **支持重构**: 安全的代码重构基础
3. **文档价值**: 测试用例作为使用示例
4. **CI集成**: 支持持续集成门禁

## 反例场景

以下实现将被拒绝：
1. ❌ 使用jest而非vitest
2. ❌ 未mock外部依赖导致实际文件操作
3. ❌ 未处理process.exit导致测试进程退出
4. ❌ 测试用例相互依赖
5. ❌ 覆盖率低于100%
6. ❌ 缺少文件头注释
7. ❌ 未测试错误场景
