# 修复发现与结论

## 已修复问题
1. **AI_MAP 模式标注错误**：之前根据 `project.name` 误判模式，现改为读取 `actualMode`。
2. **依赖图误连/重复边**：移除基于文件名模糊匹配，改为基于导入路径解析并去重。
3. **dependents 缺失**：分析阶段现在根据依赖边回填 `module.dependents`。
4. **smart 模式 ID 冲突风险**：模块 ID 改为基于路径哈希，避免同名文件冲突。
5. **context 反向依赖失真**：`Imported By` 改为基于 `dependents` 生成，不再错误自指。
6. **context 索引链接错误**：`context/README.md` 链接改为 `./src/...`。
7. **输出产物一致性**：`generate` 现生成 `dependency-graph.md`，并新增根入口 `CONTEXT.md` 指向 `context/README.md`。

## 测试覆盖
- 新增 `src/core/__tests__/analyzer.test.ts`
  - 验证依赖边去重
  - 验证 dependents 回填
  - 验证常见同名文件 ID 不冲突
- 新增 `src/generator/__tests__/context.test.ts`
  - 验证 context 索引链接
  - 验证根 `CONTEXT.md` 入口文件
  - 验证 Imported By 不自指

## 验证结果
- `npm test`：全部通过（88/88）
- `npm run build`：通过

## 再生成差异摘要（修复后）
- 基线目录：`/tmp/codemap-before-3dumZ5`
- `codemap generate` 后：新增 4、变更 55、删除 0
- 新增文件：`CONTEXT.md`、`dependency-graph.md`、`context/src/core/__tests__/analyzer.test.md`、`context/src/generator/__tests__/context.test.md`
