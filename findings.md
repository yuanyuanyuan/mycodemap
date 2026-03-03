# Findings: 测试报告问题分析

## 测试报告问题汇总

### 1. test_report_scenario5.md (查询功能和JSON输出)

#### P1 问题
- **性能差距明显**: CodeMap 比 rg 慢约 100 倍
  - 原因: 需要加载索引，而 rg 是实时搜索
  - 部分完成: 缓存优化已将查询从 ~500ms 降至 ~60ms

- **JSON details 字段不够结构化**: details 是自然语言描述
  - 已完成: 添加了 location 和 isExported 字段

#### P2 问题
- **依赖查询结果存在重复**: dependency 和 import 类型成对出现
- **deps 与 query -d 输出格式不一致**
- **缺少正则表达式支持**

### 2. test_scenario_3_impact_analysis_report.md (影响范围分析)

#### P1 问题
- **遗漏 re-export 依赖**: `export { analyze } from './core/analyzer.js'` 未被检测
  - 示例: src/index.ts 导出 core/analyzer.ts 的函数，但 impact 未识别

#### P2 问题
- **风险等级阈值不明确**: 13 和 38 依赖都被归为"极高风险"
- **执行时间较长**: 比 ripgrep 慢 60-80 倍（部分完成 - 缓存优化）

### 3. test-report-symbol-search.md (符号搜索对比)

#### P0 问题
- **符号搜索遗漏 GitAnalyzer**: 已修复 (70d84fc)

#### P1 问题
- **大小写处理不一致**: 部分完成
- **速度性能差**: 部分完成 - 缓存+索引优化

#### P2 问题
- **结果数量有限**: 默认限制 20 条

#### P3 问题
- **缺少引用信息**: 只返回定义位置
- **无代码上下文**: 不显示匹配行的代码片段

### 4. test-scenario-4-complexity-analysis.md (复杂度分析)

#### P0 问题
- **可维护性指数全部为100**: 已修复

#### P1 问题
- **圈复杂度为估算值**: 已完成 - 基于 AST 的精确计算
- **缺乏函数级复杂度详情**: 已完成 - 添加 --detail 选项

#### P2 问题
- **认知复杂度计算过于简化**: 部分完成 - 基于 AST

#### P3 问题
- **codemap.json 不存储复杂度**: 未处理

---

## 任务分组建议

### 任务组 1: 查询功能和 JSON 输出 (P1-P2)
- 性能优化
- 依赖查询去重
- 输出格式统一
- 正则表达式支持

### 任务组 2: 影响范围分析 (P1-P2)
- re-export 依赖检测
- 风险等级阈值细化

### 任务组 3: 符号搜索 (P1-P3)
- 大小写处理
- 结果数量限制
- 引用信息
- 代码上下文

### 任务组 4: 复杂度分析 (P3)
- codemap.json 存储复杂度

---

## 相关代码位置

- 查询功能: `src/cli/commands/query.ts`
- 依赖分析: `src/cli/commands/deps.ts`, `src/cli/commands/impact.ts`
- 复杂度分析: `src/cli/commands/complexity.ts`
- 索引生成: `src/generator/`
- 缓存模块: `src/cache/`

---

## 验证命令

```bash
# 查询功能测试
./codemap query -s "ModuleInfo"
./codemap query -d "analyzer"

# 影响分析测试
./codemap impact -f src/core/analyzer.ts

# 复杂度测试
./codemap complexity
./codemap complexity -f src/core/analyzer.ts --detail
```

---

## 2026-03-03 新发现：`npm test` 慢与高 CPU 根因

- `package.json:13` 是 `vitest run`，慢点不在 npm 脚本本身，而在被包含的测试内容。
- 历史慢点主因是 `refer/benchmark-quality.test.ts`，该文件单独耗时约 `279,494ms`（JSON 报告统计）。
- 基准测试文件中 `runBenchmark()` 被调用 3 次（第 14/20/25 行），每次循环 30 条查询（`BENCHMARK_QUERIES` 长度 30，for 循环逐条执行）。
- 每条查询都会 `execSync` 启动 `node dist/cli/index.js analyze ...`，并额外执行一次 `rg` 基线命令，进程创建成本很高。
- `runQuery` 的外部命令超时上限 5s，`runRgBaseline` 上限 3s，理论最坏耗时可达数分钟级。
- 当前仓库已把 `refer/**/*.test.ts` 从默认测试里排除，但 `npm run benchmark` 仍调用 `vitest run refer/benchmark-quality.test.ts`，与排除规则冲突导致 “No test files found”。
- 当前 `vitest.config.ts` 使用 `pool: 'vmThreads'`，本地实测 `npm test` 出现 `Segmentation fault`；改为 `--pool=threads` 可稳定通过并在约 8s 完成 701 测试。

## 2026-03-03 修复后验证结果

- 已新增 `vitest.benchmark.config.ts`（单独包含 `refer/benchmark-quality.test.ts`），并让 `scripts/run-benchmark.sh` 使用该配置，`npm run benchmark` 恢复可用。
- 已将常规测试池改为 `threads`，并限制线程数 `1~4`，避免 `vmThreads` 崩溃问题。
- 已将 benchmark 测试改为 `beforeAll` 执行一次 `runBenchmark()`，三个断言复用同一份结果。
- 本地验证：
  - `npm test -- --reporter=basic --silent`：`34 files / 701 tests` 通过，墙钟约 `8.32s`，CPU `405%`，峰值 RSS 约 `1.11GB`。
  - `npm run benchmark -- --reporter=basic --silent`：`1 file / 4 tests` 通过，墙钟约 `2:56.98`，CPU `131%`，峰值 RSS 约 `169MB`。
- 残留风险：benchmark 过程会输出大量 `ast-grep scan` 错误日志（不影响通过，但会污染控制台，后续可单独降噪）。

## 2026-03-03 新功能：codemap 运行日志保留

- 新增 `src/cli/runtime-logger.ts`，提供：
  - 运行日志写入（按天文件：`codemap-YYYY-MM-DD.log`）
  - 自动清理（默认保留 14 天 + 最多 30 文件）
  - 日志按大小轮转（默认 10MB）并自动 gzip 压缩历史分片
  - 环境变量开关与参数化（启停、目录、保留天数、文件上限）
- 在 CLI 入口 `src/cli/index.ts` 接入 `setupRuntimeLogging(process.argv.slice(2))`，保证各子命令共享同一日志能力。
- 新增测试 `src/cli/__tests__/runtime-logger.test.ts`：
  - 默认配置解析
  - 关闭开关解析
  - 过期/超量文件清理
- 文档已同步：
  - `README.md` 增加功能测试/基准测试命令区分
  - `README.md` 增加“运行日志（调试追踪）”说明与环境变量

## 2026-03-03 基准日志降噪补充

- `refer/benchmark-quality.ts` 改为 `spawnSync` 显式捕获子进程 `stdout/stderr`，避免大段 stderr 直接刷屏。
- 查询失败或警告会写入独立错误日志：`.codemap/logs/benchmark-errors/benchmark-errors-*.log`。
- 控制台仅保留摘要，详细错误文本分流到错误日志，便于 CI 日志阅读。
- 修复 `refer/benchmark-quality.ts` 的 CLI 入口副作用：仅在直接执行脚本时运行 `main()`，避免被测试 import 时重复执行基准。
