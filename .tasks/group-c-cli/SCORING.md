# CLI命令模块测试任务评分规则

## 总分: 100分

---

## 评分维度

### Phase 1: 测试文件结构 (20分)

| 检查项 | 分值 | 说明 |
|--------|------|------|
| 8个测试文件全部创建 | 8分 | 每个文件1分 |
| 包含[META]和[WHY]注释 | 8分 | 每个文件1分 |
| 正确使用vitest导入 | 4分 | 每个文件0.5分 |

**评分细则:**
- `complexity.test.ts` 存在: 1分
- `cycles.test.ts` 存在: 1分
- `generate.test.ts` 存在: 1分
- `init.test.ts` 存在: 1分
- `query.test.ts` 存在: 1分
- `watch.test.ts` 存在: 1分
- `watch-foreground.test.ts` 存在: 1分
- `workflow.test.ts` 存在: 1分
- 每个文件包含 `[META]`: 0.5分
- 每个文件包含 `[WHY]`: 0.5分
- 使用 `from 'vitest'` 导入: 0.25分/文件
- 包含 `describe(`: 0.25分/文件

---

### Phase 2: 测试覆盖率 (25分)

| 检查项 | 分值 | 说明 |
|--------|------|------|
| 语句覆盖率100% | 7分 | 8个文件平均 |
| 分支覆盖率100% | 6分 | 8个文件平均 |
| 函数覆盖率100% | 6分 | 8个文件平均 |
| 行覆盖率100% | 6分 | 8个文件平均 |

**评分公式:**
```
语句覆盖率得分 = 7 × (实际语句覆盖率 / 100)
分支覆盖率得分 = 6 × (实际分支覆盖率 / 100)
函数覆盖率得分 = 6 × (实际函数覆盖率 / 100)
行覆盖率得分 = 6 × (实际行覆盖率 / 100)
```

**覆盖目标文件:**
- `src/cli/commands/complexity.ts`
- `src/cli/commands/cycles.ts`
- `src/cli/commands/generate.ts`
- `src/cli/commands/init.ts`
- `src/cli/commands/query.ts`
- `src/cli/commands/watch.ts`
- `src/cli/commands/watch-foreground.ts`
- `src/cli/commands/workflow.ts`

---

### Phase 3: 模拟策略 (15分)

| 检查项 | 分值 | 说明 |
|--------|------|------|
| console.log mock | 4分 | 0.5分/文件 |
| console.error mock | 4分 | 0.5分/文件 |
| process.exit mock | 4分 | 0.5分/文件 |
| vi.mock使用 | 3分 | 必须mock外部依赖 |

**必须mock的模块:**
- `chalk` - 所有测试文件
- `fs` - 除workflow外的所有文件
- `child_process` - generate, watch相关
- `chokidar` - watch相关
- `ora` - generate
- `commander` - workflow

---

### Phase 4: 功能测试 (30分)

| 测试文件 | 分值 | 必测功能 |
|----------|------|----------|
| complexity.test.ts | 4分 | ComplexityCommand类、complexityCommand函数、JSON/人类输出、错误处理 |
| cycles.test.ts | 4分 | 循环检测、深度限制、JSON输出、无循环场景 |
| generate.test.ts | 4分 | 生成流程、模式选择、AI逻辑、错误处理 |
| init.test.ts | 3分 | 配置创建、已存在处理、内容验证 |
| query.test.ts | 4分 | 符号/模块/依赖/搜索查询、JSON输出 |
| watch.test.ts | 4分 | 前后台模式、状态查询、停止逻辑 |
| watch-foreground.test.ts | 3分 | 文件监听、变更处理、防抖、SIGINT |
| workflow.test.ts | 4分 | 所有子命令、错误码、状态转换 |

**功能测试检查点:**

#### complexity.test.ts (4分)
- [ ] ComplexityCommand.run() 正常返回: 1分
- [ ] ComplexityCommand.runEnhanced() 返回UnifiedResult: 1分
- [ ] complexityCommand JSON输出: 0.5分
- [ ] complexityCommand 错误处理: 0.5分
- [ ] 代码地图不存在处理: 1分

#### cycles.test.ts (4分)
- [ ] 无循环依赖场景: 1分
- [ ] 检测到循环依赖: 1分
- [ ] 自定义深度限制: 0.5分
- [ ] JSON输出验证: 0.5分
- [ ] 代码地图不存在: 1分

#### generate.test.ts (4分)
- [ ] 正常生成流程: 1分
- [ ] 不同模式执行: 0.5分
- [ ] AI上下文开关: 0.5分
- [ ] Claude Code检测: 0.5分
- [ ] 错误处理: 1分
- [ ] Spinner状态更新: 0.5分

#### init.test.ts (3分)
- [ ] 成功创建配置: 1分
- [ ] 已存在配置处理: 1分
- [ ] 默认配置内容: 1分

#### query.test.ts (4分)
- [ ] 符号查询: 1分
- [ ] 模块查询: 0.5分
- [ ] 依赖查询: 0.5分
- [ ] 模糊搜索: 0.5分
- [ ] JSON输出: 0.5分
- [ ] 无参数退出: 1分

#### watch.test.ts (4分)
- [ ] 前台模式: 1分
- [ ] 后台模式: 0.5分
- [ ] 停止命令: 0.5分
- [ ] 状态查询: 0.5分
- [ ] 已在运行处理: 0.5分
- [ ] 未运行处理: 1分

#### watch-foreground.test.ts (3分)
- [ ] 初始分析: 0.5分
- [ ] 监听设置: 0.5分
- [ ] 变更事件: 0.5分
- [ ] 防抖逻辑: 0.5分
- [ ] SIGINT处理: 1分

#### workflow.test.ts (4分)
- [ ] start子命令: 0.5分
- [ ] status子命令: 0.5分
- [ ] proceed子命令: 0.5分
- [ ] resume子命令: 0.5分
- [ ] checkpoint子命令: 0.5分
- [ ] list子命令: 0.5分
- [ ] delete子命令: 0.5分
- [ ] 错误码验证: 1分

---

### Phase 5: 代码规范 (10分)

| 检查项 | 分值 | 说明 |
|--------|------|------|
| TypeScript类型使用 | 4分 | 0.5分/文件 |
| 正确的导入语句 | 3分 | 0.375分/文件 |
| beforeEach/afterEach | 3分 | 0.375分/文件 |

**规范检查:**
- 使用 `type Mock`: 0.5分/文件
- 从 `'../xxx.js'` 导入: 0.375分/文件
- 包含 `beforeEach`: 0.1875分/文件
- 包含 `afterEach`: 0.1875分/文件

---

## 评分等级

| 等级 | 分数范围 | 说明 |
|------|----------|------|
| **A (优秀)** | 90-100分 | 所有测试通过，覆盖率100%，代码规范优秀 |
| **B (良好)** | 80-89分 | 主要功能测试通过，覆盖率>95%，少量规范问题 |
| **C (合格)** | 70-79分 | 核心功能测试通过，覆盖率>90%，存在规范问题 |
| **D (不合格)** | 60-69分 | 部分功能缺失，覆盖率>80%，需要返工 |
| **F (失败)** | <60分 | 大量功能缺失，覆盖率<80%，完全不合格 |

---

## 执行评分命令

```bash
# 1. 运行所有测试
npx vitest run src/cli/commands/__tests__

# 2. 生成覆盖率报告
npx vitest run --coverage src/cli/commands

# 3. 查看覆盖率详情
cat coverage/coverage-summary.json | jq '.total'

# 4. 类型检查
npx tsc --noEmit
```

---

## 扣分项

| 违规项 | 扣分 |
|--------|------|
| 未mock外部依赖导致实际IO | -10分/次 |
| 测试用例相互依赖 | -5分/处 |
| 未处理process.exit | -5分/文件 |
| 缺少错误场景测试 | -3分/文件 |
| 文件头缺少[META]/[WHY] | -2分/文件 |
| 使用any类型 | -1分/处 |

---

## 最终得分计算

```
总分 = Phase1 + Phase2 + Phase3 + Phase4 + Phase5 - 扣分项
```

**最低通过标准: 70分 (C级)**
