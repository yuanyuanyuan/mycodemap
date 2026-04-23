# 发布与打包规则

## 适用范围

本项目当前主要交付形态是 npm 包与 CLI，而不是长期运行的服务部署。

## 发布前检查

- 运行 `npm run build`，确保 `dist/` 产物可生成。
- 运行 `npm test`，确保核心行为未回退。
- 运行 `npm run validate-pack`，检查打包内容。
- 核对 `package.json` 中 `files`、`bin`、`exports` 是否与真实产物一致。

## 当前事实

- CLI bin：`dist/cli/index.js`
- 库入口：`dist/index.js`
- `prepublishOnly` 已要求构建并测试

## Milestone-bound releases

- 每个 milestone 对应一个 npm release，不再把 milestone closeout 与 npm 发布视为两套彼此无关的流程。
- 版本映射规则是 `vX.Y → X.Y.0`；例如 `v1.9 → 1.9.0`。
- 统一入口是 `/release`，它负责串起 readiness 检查、milestone closeout、版本映射、确认门和现有发布工具链。
- 不得绕过 GSD milestone closeout 直接执行发布；`scripts/release.sh` 与 `.github/workflows/publish.yml` 只在 `/release` 或等价人工确认流程之后触发。

## 禁止事项

- 不得通过跳过测试或伪造产物完成发布。
- 不得把只存在于本地的临时输出目录当成发布事实。
