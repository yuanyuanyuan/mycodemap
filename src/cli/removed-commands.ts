// [META] since:2026-03-24 | owner:orchestrator-team | stable:true
// [WHY] 为已从公共 CLI 移除的命令提供统一、可测试的迁移提示

export type RemovedCommandName = 'server' | 'watch' | 'report' | 'logs';

export interface RemovedCommandNotice {
  readonly headline: string;
  readonly guidance: readonly string[];
}

export const REMOVED_COMMAND_NOTICES: Record<RemovedCommandName, RemovedCommandNotice> = {
  server: {
    headline: '命令 `server` 已从 public CLI 移除（removed from public CLI）。',
    guidance: [
      'Server Layer 仍然是内部架构层，不等于公开 `mycodemap server` 命令。',
      '请运行 `mycodemap --help` 查看当前仍受支持的公共命令。',
    ],
  },
  watch: {
    headline: '命令 `watch` 已从 public CLI 移除（removed from public CLI）。',
    guidance: [
      '请改用一次性的 `mycodemap generate` 刷新代码地图，而不是后台 watch 模式。',
      '请运行 `mycodemap --help` 查看当前仍受支持的公共命令。',
    ],
  },
  report: {
    headline: '命令 `report` 已从 public CLI 移除（removed from public CLI）。',
    guidance: [
      '请直接读取 `.mycodemap/AI_MAP.md`，或使用 `mycodemap export <format>` 导出结果。',
      '请运行 `mycodemap --help` 查看当前仍受支持的公共命令。',
    ],
  },
  logs: {
    headline: '命令 `logs` 已从 public CLI 移除（removed from public CLI）。',
    guidance: [
      '请直接读取 `.mycodemap/logs/` 下的日志文件，而不是继续使用旧 CLI 命令。',
      '请运行 `mycodemap --help` 查看当前仍受支持的公共命令。',
    ],
  },
};

export function getRemovedTopLevelCommand(argv: readonly string[]): RemovedCommandName | null {
  const [commandName] = argv;

  if (!commandName || commandName.startsWith('-')) {
    return null;
  }

  return isRemovedCommandName(commandName) ? commandName : null;
}

export function formatRemovedCommandMessage(commandName: RemovedCommandName): string {
  const notice = REMOVED_COMMAND_NOTICES[commandName];
  const guidanceLines = notice.guidance.map(line => `- ${line}`);

  return [notice.headline, ...guidanceLines].join('\n');
}

function isRemovedCommandName(commandName: string): commandName is RemovedCommandName {
  return commandName in REMOVED_COMMAND_NOTICES;
}
