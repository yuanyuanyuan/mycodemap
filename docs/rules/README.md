# docs/rules/

本目录存放会直接影响开发与交付行为的规则文档。

## 当前文件

- `testing.md`：测试框架、覆盖率、测试文件位置。
- `validation.md`：构建、类型检查、lint、CI 验证顺序。
- `deployment.md`：打包、发布前检查与发布边界。

## 写作边界

- 写“必须怎么做”，不写长篇设计推演。
- 若规则来自代码事实，优先引用 `package.json`、`tsconfig.json`、CI 或 hooks。
- 若规则变化会影响 agent 行为，应同步检查入口文档。
