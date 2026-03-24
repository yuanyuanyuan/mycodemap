---
phase: 08-plugin-runtime-integration
plan: 02
subsystem: "failure-isolation"
tags: [plugins, diagnostics, e2e, safety]
requirements_completed: [PLG-06]
one_liner: "插件失败隔离、built-in/user plugin 加载路径与输出安全边界都已加固。"
completed: 2026-03-24
---

# 08-02 Summary

**插件失败隔离、built-in/user plugin 加载路径与输出安全边界都已加固。**

## 完成内容

- `PluginRegistry` 已把 `initialize / analyze / generate` 三阶段失败统一转成结构化 diagnostics，不再只靠 console/logger。
- `PluginLoader` 修复了 built-in plugin 重复加载问题，并允许用户通过名字显式启用 `complexity-analyzer` 等内置插件。
- `src/cli/config-loader.ts` 会把 `pluginDir` 归一化为绝对路径，真实 CLI 下用户插件不再因相对路径解析失败。
- `generate` 写出插件生成文件前会做路径越界保护；写入失败也会进入 diagnostics，而不是把错误吞掉。

## 验证

- `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/config-loader.test.ts`
- 真实 CLI built-in / user plugin fixture 双场景验证
- `npm run typecheck`

## 失败场景预演

- failing user plugin 会在 diagnostics 中暴露失败阶段，但 `good-plugin` 仍继续输出 `plugins/good.txt`。
- 若 `pluginDir` 没被解析为绝对路径，真实 CLI 的 user plugin fixture 会直接失败；本轮已通过 fixture 回归锁住该问题。
