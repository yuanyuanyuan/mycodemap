# Progress: 测试报告问题修复进度

## Session Log

### 2026-03-03
- [x] 检查之前会话恢复
- [x] 创建 task_plan.md
- [x] 读取所有测试报告文件
- [x] 创建 findings.md
- [x] 组建 Agent 团队 (4个Agent并行处理)
- [x] 执行并行修复
- [x] 验证修复 (705/705 测试通过)

## 修改的文件

### 1. 查询功能增强 (src/cli/commands/query.ts)
- 添加 --regex 正则表达式搜索支持
- 添加 --case-sensitive 大小写敏感选项
- 添加 --context 代码上下文行数选项
- 添加 --include-references 引用信息选项
- 添加 --deps-format 依赖输出格式选项
- 添加 findReferences 函数查找符号引用位置

### 2. CLI 选项更新 (src/cli/index.ts)
- -r, --regex: 正则表达式搜索
- -c, --context: 代码上下文行数
- --case-sensitive: 大小写敏感搜索
- --include-references: 包含引用位置
- --deps-format: 依赖查询输出格式
- -l 默认值从20改为50

### 3. 影响分析增强 (src/cli/commands/impact.ts)
- 细化风险等级阈值：
  - 0-2: 低风险
  - 3-10: 中风险
  - 11-25: 高风险
  - 26+: 极高风险

### 4. Re-export 检测 (src/parser/implementations/fast-parser.ts)
- 支持 export { ... } from '...'
- 支持 export * from '...'
- 支持 export { default } from '...'

### 5. 类型定义 (src/types/index.ts)
- 添加 ReferenceInfo 接口
- 添加 CodeContext 接口
- 修改 ImportInfo 添加 isReExport 字段

## 测试结果

- 总测试数: 705
- 通过: 705
- 失败: 0

## 待处理问题

- codemap.json 不存储复杂度数据 (P3)

---

## 2026-03-03：`package.json:13` 性能排查记录

- [x] 读取 `package.json` 与 `vitest.config.ts` 定位默认测试入口与匹配规则
- [x] 采集测试规模：当前默认匹配 `src/**/*.test.ts`，共 34 个测试文件（约 701 tests）
- [x] 子代理采集历史慢跑证据：完整测试约 398.61s、CPU 141%、峰值 RSS ~1.18GB
- [x] 识别慢文件：`refer/benchmark-quality.test.ts` 单文件约 279.5s（历史数据）
- [x] 复现实验：`vmThreads` 下 `npm test` 触发 Segmentation fault；`threads` 池下约 8.32s 全通过
- [x] 识别当前缺陷：`benchmark` 脚本与默认排除规则冲突，执行结果为 “No test files found”
- [x] 新增 `vitest.benchmark.config.ts`，将性能基准测试与功能测试彻底分离
- [x] 更新 `scripts/run-benchmark.sh` 改用 benchmark 专用配置
- [x] 更新 `refer/benchmark-quality.test.ts`：`runBenchmark()` 从 3 次降为 1 次（`beforeAll` 复用）
- [x] 新增 `npm run test:all` 作为串联验证入口
- [x] 验证通过：`npm test`（34/701）与 `npm run benchmark`（1/4）

## 2026-03-03：codemap 运行日志保留

- [x] 新增 `src/cli/runtime-logger.ts`
  - 默认日志目录 `.codemap/logs`
  - 默认策略：保留 14 天、最多 30 文件
  - 新增策略：单文件超过 10MB 自动轮转并 gzip
  - 环境变量：`CODEMAP_RUNTIME_LOG_ENABLED` / `CODEMAP_RUNTIME_LOG_DIR` / `CODEMAP_RUNTIME_LOG_RETENTION_DAYS` / `CODEMAP_RUNTIME_LOG_MAX_FILES`
- [x] 在 `src/cli/index.ts` 接入运行日志初始化
- [x] 新增单元测试 `src/cli/__tests__/runtime-logger.test.ts`（4 条）
- [x] 文档同步 `README.md`（测试命令拆分 + 运行日志说明）
- [x] 验证：
  - `npx vitest run src/cli/__tests__/runtime-logger.test.ts` 通过（4/4）
  - `npm test -- --reporter=basic --silent` 通过（35 files / 705 tests）
  - `npm run benchmark -- --reporter=basic --silent` 通过（1 file / 4 tests）
  - `npm run build && node dist/cli/index.js --version` 后，日志文件生成：`.codemap/logs/codemap-2026-03-03.log`

## 2026-03-03：benchmark 日志降噪

- [x] `refer/benchmark-quality.ts` 改为 `spawnSync` 捕获输出，避免 stderr 大段内容直出控制台
- [x] 新增 benchmark 错误详情分流：`.codemap/logs/benchmark-errors/benchmark-errors-*.log`
- [x] 修复 benchmark 脚本被 import 时重复执行问题（`main()` 仅 direct-run 触发）
- [x] 验证：
  - `npm run benchmark -- --reporter=basic --silent` 控制台日志从数千行降到约 30 行
  - benchmark 耗时从约 169s 降到约 87s（去除重复执行）
