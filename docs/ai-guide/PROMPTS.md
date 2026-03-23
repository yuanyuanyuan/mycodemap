# AI Guide - 提示词模板库

> 即用型提示词模板，可直接使用或根据场景改编

---

## 模板 1: 项目理解

**适用场景**: 首次接触项目，需要快速了解整体结构

```markdown
我需要理解这个 TypeScript 项目的结构。

请执行以下步骤：

1. **生成代码地图**
   ```bash
   node dist/cli/index.js generate
   ```

2. **阅读项目概览**
   阅读 `.mycodemap/AI_MAP.md` 文件

3. **获取详细信息**
   ```bash
   node dist/cli/index.js analyze -i overview -t "src/" --json
   ```

4. **回答以下问题**
   - 项目的主要模块有哪些？
   - 模块之间的依赖关系是什么？
   - 核心功能入口在哪里？
   - 有哪些关键类/接口？
   - 项目使用什么架构模式？

请以结构化方式输出分析结果，包括：
- 项目基本信息
- 架构图（文字描述）
- 关键模块说明
- 入口点列表
```

---

## 模板 2: 变更影响分析

**适用场景**: 修改某个文件前，评估影响范围

```markdown
我需要修改文件 {{FILE_PATH}}，请帮我分析影响范围。

请执行以下步骤：

1. **影响分析**
   ```bash
   node dist/cli/index.js analyze -i impact -t "{{FILE_PATH}}" --transitive --include-tests --json
   ```

2. **分析结果**
   从 JSON 输出中提取：
   - 直接依赖的文件有哪些？
   - 传递依赖的文件有哪些？
   - 可能受影响的测试文件？
   - 置信度评分如何？

3. **风险评估**
   - 影响范围大吗？（文件数量、涉及模块）
   - 是否有高风险文件？（核心模块、频繁修改）
   - 是否需要拆分修改？

4. **给出建议**
   - 修改时需要注意什么？
   - 需要更新哪些测试？
   - 是否有替代方案？
   - 推荐的修改顺序？

请以表格形式列出受影响的文件，按相关度排序。
```

**变量**:
- `{{FILE_PATH}}`: 要修改的文件路径，例如 `src/cli/index.ts`

---

## 模板 3: 代码搜索

**适用场景**: 查找与特定关键词相关的代码

```markdown
我需要找到与 "{{KEYWORD}}" 相关的所有代码。

请执行以下步骤：

1. **精确查询**
   ```bash
   node dist/cli/index.js query -s "{{KEYWORD}}" -j
   ```

2. **如果结果不足，进行模糊搜索**
   ```bash
   node dist/cli/index.js query -S "{{KEYWORD}}" -l 20 -j
   ```

3. **如果仍不足，使用统一搜索**
   ```bash
   node dist/cli/index.js analyze -i search -k "{{KEYWORD}}" --topK 15 --json
   ```

4. **汇总结果**
   按以下类别分组输出：
   - 精确匹配（符号名完全一致）
   - 模糊匹配（包含关键词）
   - 相关引用（导入/使用了相关符号）

对于每个结果，提供：
- 文件路径
- 行号
- 符号类型（类/函数/接口等）
- 相关度评分
- 简短描述
```

**变量**:
- `{{KEYWORD}}`: 搜索关键词，例如 `IntentRouter` 或 `CacheManager`

---

## 模板 4: 重构评估

**适用场景**: 评估重构某个模块的可行性

```markdown
我需要评估重构 {{MODULE_PATH}} 的可行性。

请执行以下步骤：

1. **检测现有问题**
   ```bash
   node dist/cli/index.js cycles -j
   node dist/cli/index.js analyze -i complexity -t "{{MODULE_PATH}}" --json
   ```

2. **获取重构建议**
   ```bash
   node dist/cli/index.js analyze -i refactor -t "{{MODULE_PATH}}" --json
   ```

3. **评估影响范围**
   ```bash
   node dist/cli/index.js analyze -i impact -t "{{MODULE_PATH}}" --scope transitive --json
   ```

4. **生成评估报告**
   包括以下内容：

   ## 当前架构问题
   - 存在的循环依赖
   - 复杂度过高的文件/函数
   - 代码质量问题

   ## 重构建议
   - 推荐的重构策略
   - 目标架构设计
   - 重构步骤分解

   ## 风险评估
   - 影响范围（文件数、模块数）
   - 风险等级（高/中/低）
   - 回滚难度

   ## 实施计划
   - 步骤 1: ...
   - 步骤 2: ...
   - ...

   ## 测试策略
   - 需要更新的测试
   - 建议新增的测试
```

**变量**:
- `{{MODULE_PATH}}`: 模块路径，例如 `src/domain/services`

---

## 模板 5: 代码审查

**适用场景**: 审查代码变更是否符合规范

```markdown
请帮我审查这次代码变更。

请执行以下步骤：

1. **提交格式检查**
   ```bash
   node dist/cli/index.js ci check-commits
   ```

2. **文件头检查**
   ```bash
   node dist/cli/index.js ci check-headers
   ```

3. **风险评估**
   ```bash
   node dist/cli/index.js ci assess-risk
   ```

4. **输出契约检查**（如果修改了 analyze 命令）
   ```bash
   node dist/cli/index.js ci check-output-contract
   ```

5. **文档同步检查**
   ```bash
   node dist/cli/index.js ci check-docs-sync
   ```

6. **生成审查报告**

   ## 审查结果

   ### 提交规范
   - [ ] 提交格式正确（[TAG] scope: message）
   - [ ] 单次提交文件数 ≤ 10

   ### 代码规范
   - [ ] 文件头包含 [META] 和 [WHY]
   - [ ] 无敏感信息硬编码
   - [ ] 函数长度 ≤ 50 行
   - [ ] 无未处理 Promise

   ### 风险评估
   - 风险等级：高/中/低
   - 风险因素：...

   ### 建议
   - 需要改进的地方
   - 可选的优化建议
```

---

## 模板 6: 依赖分析

**适用场景**: 分析模块依赖关系，优化架构

```markdown
请分析 {{MODULE_PATH}} 的依赖关系。

请执行以下步骤：

1. **依赖分析**
   ```bash
   node dist/cli/index.js analyze -i dependency -t "{{MODULE_PATH}}" --json
   ```

2. **循环依赖检测**
   ```bash
   node dist/cli/index.js cycles -j
   ```

3. **影响范围评估**
   ```bash
   node dist/cli/index.js deps -m "{{MODULE_PATH}}" -j
   ```

4. **生成依赖报告**

   ## 依赖图
   （文字描述或 Mermaid 图）

   ## 直接依赖
   | 模块 | 类型 | 说明 |
   |------|------|------|

   ## 被依赖模块
   | 模块 | 类型 | 说明 |
   |------|------|------|

   ## 循环依赖
   （如果有，列出循环路径）

   ## 架构建议
   - 依赖是否合理？
   - 是否存在循环依赖？
   - 是否需要调整依赖方向？
```

---

## 模板 7: 复杂度分析

**适用场景**: 识别复杂代码，指导重构优先级

```markdown
请分析项目的代码复杂度。

请执行以下步骤：

1. **整体复杂度分析**
   ```bash
   node dist/cli/index.js analyze -i complexity -t "src/" --json
   ```

2. **函数级复杂度**（针对复杂文件）
   ```bash
   node dist/cli/index.js complexity -f "{{COMPLEX_FILE}}" -d -j
   ```

3. **生成复杂度报告**

   ## 整体统计
   - 平均复杂度：
   - 最大复杂度：
   - 可维护性指数：

   ## 最复杂的文件（Top 10）
   | 排名 | 文件 | 复杂度 | 可维护性 |
   |------|------|--------|----------|

   ## 最复杂的函数（Top 10）
   | 排名 | 函数 | 文件 | 圈复杂度 | 认知复杂度 |
   |------|------|------|----------|------------|

   ## 重构建议
   - 优先重构的文件
   - 重构策略建议
```

---

## 模板 8: 新功能实现

**适用场景**: 从零开始实现一个新功能

```markdown
我需要实现新功能：{{FEATURE_DESCRIPTION}}

请执行以下步骤：

1. **相关代码搜索**
   ```bash
   node dist/cli/index.js analyze -i search -k "{{RELATED_KEYWORD}}" --topK 10 --json
   ```

2. **参考现有实现**
   分析类似功能的实现方式

3. **确定实现位置**
   ```bash
   node dist/cli/index.js analyze -i complexity -t "候选目录" --json
   ```
   选择复杂度最低的模块

4. **影响分析**（如果需要修改现有代码）
   ```bash
   node dist/cli/index.js analyze -i impact -t "目标文件" --json
   ```

5. **实现步骤**
   - [ ] 创建新文件（添加 [META] [WHY] 头）
   - [ ] 实现核心功能
   - [ ] 添加单元测试
   - [ ] 运行测试验证

6. **验证**
   ```bash
   node dist/cli/index.js ci check-headers -f "新文件.ts"
   npm test
   ```

请提供：
- 推荐的实现位置
- 参考的现有代码
- 实现步骤分解
- 测试建议
```

---

## 模板使用指南

### 如何选择模板

| 场景 | 推荐模板 |
|------|---------|
| 第一次看项目 | 模板 1: 项目理解 |
| 要修改代码 | 模板 2: 变更影响分析 |
| 找某个功能 | 模板 3: 代码搜索 |
| 要重构 | 模板 4: 重构评估 |
| 提交前检查 | 模板 5: 代码审查 |
| 看模块关系 | 模板 6: 依赖分析 |
| 找复杂代码 | 模板 7: 复杂度分析 |
| 做新功能 | 模板 8: 新功能实现 |

### 如何自定义模板

1. **替换变量**: 将 `{{VARIABLE}}` 替换为实际值
2. **调整命令**: 根据实际需要添加/删除命令
3. **修改输出**: 调整期望的输出格式和内容
4. **添加约束**: 添加项目特定的约束条件

### 组合使用

复杂任务可以组合多个模板：

```
项目理解 (模板 1) 
  → 代码搜索 (模板 3) 
  → 变更影响分析 (模板 2) 
  → 代码审查 (模板 5)
```
