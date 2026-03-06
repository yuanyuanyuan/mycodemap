# OMC Team 模式与 Claude Code 不兼容问题分析报告

> 生成时间：2026-03-07
> 分析范围：OMC team 模式 + Claude Code 集成

---

## 1. 问题现象

### 1.1 观察到的症状

从 trace 数据显示：
- **worker-1**: spawn 了 **11 次**
- **worker-2**: spawn 了 **3 次**
- 主 session 在 16:08 结束，reason: "other"

### 1.2 影响

- 资源快速耗尽（内存、进程）
- Claude Code 主进程可能因资源压力退出
- 任务完成状态不稳定

---

## 2. 根本原因分析

### 2.1 架构问题：V1 Runtime 的 Watchdog 循环

**问题位置**: `runtime.ts:518-647` (watchdogCliWorkers 函数)

**问题描述**:
```
watchdog tick 循环逻辑:
1. 检查 workers 的 done.json 信号
2. 如果有信号 -> markTaskFromDone -> killWorkerPane -> spawnWorkerForTask (如果有 pending 任务)
3. 如果 worker 死了 -> applyDeadPaneTransition -> requeue -> spawnWorkerForTask
```

**Bug**: 当任务完成后，watchdog 会立即 spawn 新的 worker 来执行其他 pending 任务。这导致：
- Worker 刚完成就被 kill
- 立即创建新 worker
- 如果任务列表只有 1 个任务，也会反复创建同一个 worker

### 2.2 状态同步问题

**问题**: `markTaskFromDone()` 更新任务状态为 completed，但可能存在：
- 文件系统写入延迟
- 状态读取不一致
- 导致 `allTasksTerminal()` 错误判断

### 2.3 Session 管理问题

**观察**:
- Session 在 16:08 结束 (reason: "other")
- Workers 在 16:07 完成后反复重建
- 主 session 可能因资源压力或错误退出

### 2.4 Claude Code 原生 team 集成问题

从 config.json 可见：
- Workers 使用 `in-process` backend (`"backendType": "in-process"`)
- 这意味着 workers 运行在同一个 Claude Code 进程内
- 当 worker 完成后返回结果时，可能触发主进程重新 spawn

---

## 3. 具体问题点

### 问题 1: Watchdog 立即重新分配任务

**代码位置**: `runtime.ts:559-565`
```typescript
if (signal) {
  // ... 处理完成信号
  await killWorkerPane(runtime, wName, active.paneId);
  if (!(await allTasksTerminal(runtime))) {
    const nextTaskIndexValue = await nextPendingTaskIndex(runtime);
    if (nextTaskIndexValue != null) {
      await spawnWorkerForTask(runtime, wName, nextTaskIndexValue); // 立即 spawn!
    }
  }
}
```

**问题**: 任务完成后立即 spawn 新 worker，没有给主 session 任何喘息机会

### 问题 2: Worker 复用逻辑缺失

**代码位置**: `runtime.ts:421-426`
```typescript
const maxConcurrentWorkers = agentTypes.length;
for (let i = 0; i < maxConcurrentWorkers; i++) {
  const taskIndex = await nextPendingTaskIndex(runtime);
  if (taskIndex == null) break;
  await spawnWorkerForTask(runtime, workerName(i), taskIndex);
}
```

**问题**: 每次都创建新的 workerName，而不是复用已有的 worker

### 问题 3: In-Process Workers 的状态管理

**代码位置**: config.json
```json
{
  "backendType": "in-process"
}
```

**问题**: in-process workers 完成后会返回结果给主 agent，这可能触发某种重新调度的 hook，导致反复 spawn

### 问题 4: 缺乏资源限制

**问题**: 没有机制限制：
- 单个 worker 的最大执行时间
- 总 worker spawn 次数
- 内存使用上限

---

## 4. 修复方案

### 4.1 方案 A: 启用 V2 Runtime (推荐)

**原理**: V2 runtime 使用事件驱动架构，避免轮询问题

**操作**:
```bash
export OMC_RUNTIME_V2=1
# 然后重新运行 team
```

**预期效果**:
- 更稳定的任务状态管理
- 事件驱动而非轮询
- 减少不必要的 worker 重建

### 4.2 方案 B: 修复 V1 Runtime

#### B.1 添加冷却期

**修改位置**: `runtime.ts:559-565`

```typescript
// 在 killWorkerPane 后添加延迟
await killWorkerPane(runtime, wName, active.paneId);

// 添加冷却期，避免立即重新 spawn
await new Promise(resolve => setTimeout(resolve, 2000));

if (!(await allTasksTerminal(runtime))) {
  // ... existing logic
}
```

#### B.2 添加 Worker 池机制

**修改位置**: `runtime.ts` - 新增 worker 池状态

```typescript
interface WorkerPool {
  availableWorkers: string[];  // 可复用的 worker 名称
  activeWorkers: Map<string, ActiveWorkerState>;
}

// 在 spawnWorkerForTask 中复用
async function spawnWorkerForTask(...) {
  // 先检查池中是否有可用 worker
  if (runtime.workerPool.availableWorkers.length > 0) {
    const reusableWorkerName = runtime.workerPool.availableWorkers.pop();
    // 复用该 worker
  }
  // 否则创建新 worker
}
```

#### B.3 添加资源限制

**修改位置**: `runtime.ts` - 新增限制配置

```typescript
const MAX_WORKER_SPAWNS = 20;  // 最多 spawn 次数
const WORKER_COOLDOWN_MS = 3000;  // 冷却期

// 在 watchdog 中跟踪 spawn 次数
let workerSpawnCount = 0;

async function spawnWorkerForTask(...) {
  if (workerSpawnCount >= MAX_WORKER_SPAWNS) {
    console.warn('[watchdog] Max worker spawn limit reached');
    return '';
  }
  workerSpawnCount++;
  // ... existing logic
}
```

### 4.3 方案 C: 修复 Claude Code 集成

#### C.1 修改 worker hook 逻辑

**修改位置**: `src/hooks/team-worker-hook.ts`

确保 worker 完成后：
1. 写入 done.json
2. **不自动退出** (等待主 session 指示)
3. 进入空闲状态等待新任务

#### C.2 添加状态一致性检查

**修改位置**: `runtime.ts:allTasksTerminal()`

```typescript
export async function allTasksTerminal(runtime: TeamRuntime): Promise<boolean> {
  const root = stateRoot(runtime.cwd, runtime.teamName);

  // 多次重试读取确保一致性
  for (let retry = 0; retry < 3; retry++) {
    let allTerminal = true;
    for (let i = 0; i < runtime.config.tasks.length; i++) {
      const task = await readTask(root, String(i + 1));
      if (!task) return false;  // 任务文件不存在
      if (task.status !== 'completed' && task.status !== 'failed') {
        allTerminal = false;
      }
    }
    if (allTerminal) return true;
    await new Promise(r => setTimeout(r, 100));  // 等待状态稳定
  }
  return false;
}
```

---

## 5. 实施建议

### 优先级

| 优先级 | 修复项 | 难度 | 预期效果 |
|--------|--------|------|----------|
| P0 | 启用 V2 Runtime | 低 | 立即改善 |
| P1 | 添加冷却期 | 中 | 减少频繁重建 |
| P2 | Worker 池机制 | 高 | 根本解决 |
| P3 | 资源限制 | 中 | 防止资源耗尽 |

### 验证方法

```bash
# 1. 检查 OMC_RUNTIME_V2 是否启用
echo $OMC_RUNTIME_V2

# 2. 运行 team 并监控 spawn 次数
/team 3:executor "test task"

# 3. 观察日志中 worker spawn 次数
# 修复前: worker-1 spawn 11 次
# 修复后: worker-1 spawn 1-2 次
```

---

## 6. 附录：相关代码位置

| 文件 | 说明 |
|------|------|
| `src/team/runtime.ts` | V1 runtime 核心逻辑 |
| `src/team/runtime-v2.ts` | V2 runtime (事件驱动) |
| `src/hooks/team-worker-hook.ts` | Worker 生命周期 hook |
| `src/hooks/team-leader-nudge-hook.ts` | 主 session 状态 hook |
| `src/team/tmux-session.ts` | tmux 会话管理 |
| `src/team/task-file-ops.ts` | 任务文件操作 |

---

## 7. 结论

OMC team 模式与 Claude Code 不兼容的主要原因是：

1. **V1 runtime 的 watchdog 逻辑缺陷** - 任务完成后立即重新 spawn worker
2. **缺乏 worker 复用机制** - 每次都创建新 worker
3. **资源限制缺失** - 没有防止无限 spawn 的保护
4. **In-process workers 状态同步问题** - 主进程可能因资源压力退出

**推荐优先尝试方案 A (启用 V2 Runtime)**，这是最简单且最可能立即见效的方案。
