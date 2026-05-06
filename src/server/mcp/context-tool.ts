// [META] since:2026-05-06 | owner:server-team | stable:false
// [WHY] Build a thin MCP-native routing payload from real graph metadata and executable tool catalog truth

import { getFullContract } from '../../cli/interface-contract/index.js';
import type { IStorage } from '../../interface/types/storage.js';
import { buildGraphEnvelope, toGraphStatus } from './service.js';
import type {
  McpContextDetailLevel,
  McpContextResult,
  McpContextRiskLevel,
  McpContextTask,
  McpToolSuggestion,
} from './types.js';

export interface BuildContextRoutingInput {
  task?: string;
  detailLevel?: string;
  allowedTools?: string[];
}

const VALID_TASKS: readonly McpContextTask[] = ['review', 'debug', 'default'] as const;
const VALID_DETAIL_LEVELS: readonly McpContextDetailLevel[] = ['minimal', 'standard'] as const;
const STALE_GRAPH_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

const TASK_TOOL_MAP: Record<McpContextTask, readonly McpToolSuggestion[]> = {
  review: [
    { tool: 'codemap_query', reason: '先确认相关符号或模块是否真实存在。' },
    { tool: 'codemap_impact', reason: '评估改动的调用扩散半径。' },
    { tool: 'codemap_analyze', reason: '补一层统一分析结果作为审查依据。' },
  ],
  debug: [
    { tool: 'codemap_query', reason: '先定位失败点对应的符号或文件。' },
    { tool: 'codemap_deps', reason: '检查依赖链是否把问题传播到其他模块。' },
    { tool: 'codemap_doctor', reason: '排除运行时或环境契约层面的基础故障。' },
  ],
  default: [
    { tool: 'codemap_query', reason: '快速浏览当前仓库的核心符号或模块。' },
    { tool: 'codemap_analyze', reason: '获取一份轻量的结构化分析摘要。' },
    { tool: 'codemap_doctor', reason: '在继续前确认仓库状态和运行环境健康度。' },
  ],
};

function getExecutableToolCatalog(): Set<string> {
  const names = new Set<string>(['codemap_impact', 'codemap_env_contract', 'codemap_context']);

  for (const command of getFullContract().commands) {
    names.add(`codemap_${command.name.replace(/[^a-zA-Z0-9]+/gu, '_')}`);
  }

  return names;
}

function isContextTask(task: string): task is McpContextTask {
  return VALID_TASKS.includes(task as McpContextTask);
}

function isDetailLevel(value: string): value is McpContextDetailLevel {
  return VALID_DETAIL_LEVELS.includes(value as McpContextDetailLevel);
}

function deriveRiskLevel(score: number): McpContextRiskLevel {
  if (score >= 70) {
    return 'high';
  }

  if (score >= 35) {
    return 'medium';
  }

  return 'low';
}

function isGraphStale(generatedAt: string | null): boolean {
  if (!generatedAt) {
    return false;
  }

  const parsed = Date.parse(generatedAt);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return Date.now() - parsed > STALE_GRAPH_MAX_AGE_MS;
}

function buildFocusAreas(
  parseFailureFiles: string[],
  cycles: Array<{ modules: string[] }>,
): string[] {
  const focusAreas = [
    ...parseFailureFiles.slice(0, 2).map((file) => `Parse failure: ${file}`),
    ...cycles.slice(0, 2).map((cycle) => `Cycle: ${cycle.modules.join(' -> ')}`),
  ];

  return focusAreas;
}

export async function buildContextRoutingPayload(
  storage: IStorage,
  input: BuildContextRoutingInput = {},
): Promise<McpContextResult> {
  const task = input.task ?? 'default';
  const detailLevel = input.detailLevel ?? 'standard';
  const metadata = await storage.loadGraphMetadata();
  const stats = await storage.getStatistics();
  const cycles = await storage.detectCycles();
  const graphStatus = toGraphStatus(metadata);

  if (!isDetailLevel(detailLevel)) {
    return {
      status: 'invalid_input',
      confidence: 'unavailable',
      detailLevel: 'standard',
      summary: '不支持的 detailLevel。',
      ...buildGraphEnvelope(metadata),
      graphStats: {
        modules: metadata.moduleCount,
        symbols: metadata.symbolCount,
        edges: stats.totalDependencies,
        cycles: cycles.length,
      },
      riskSummary: {
        level: 'medium',
        score: 50,
        factors: [`Unsupported detailLevel "${detailLevel}". Use minimal or standard.`],
      },
      nextToolSuggestions: [],
      warnings: ['detailLevel 无效，未生成路由建议。'],
      error: {
        code: 'INVALID_TASK',
        message: `Unsupported detailLevel "${detailLevel}". Expected minimal or standard.`,
      },
    };
  }

  if (!isContextTask(task)) {
    return {
      status: 'invalid_input',
      confidence: 'unavailable',
      detailLevel,
      summary: '不支持的上下文任务类型。',
      ...buildGraphEnvelope(metadata),
      graphStats: {
        modules: metadata.moduleCount,
        symbols: metadata.symbolCount,
        edges: stats.totalDependencies,
        cycles: cycles.length,
      },
      riskSummary: {
        level: 'medium',
        score: 50,
        factors: [`Unsupported task "${task}". Use review, debug, or default.`],
      },
      nextToolSuggestions: [],
      warnings: ['任务值无效，未生成下一步工具建议。'],
      error: {
        code: 'INVALID_TASK',
        message: `Unsupported task "${task}". Expected one of review, debug, default.`,
      },
    };
  }

  const warnings: string[] = [];
  const factors: string[] = [];
  const rationale: string[] = [];
  let score = 10;
  let confidence: McpContextResult['confidence'] = 'high';
  const staleGraph = isGraphStale(metadata.generatedAt);

  if (graphStatus === 'missing') {
    score += 45;
    confidence = 'reduced';
    warnings.push('Graph truth missing; run mycodemap generate --symbol-level before relying on impact-heavy routing.');
    factors.push('Graph metadata is missing, so routing confidence is reduced.');
  } else if (metadata.graphStatus === 'partial') {
    score += 20;
    confidence = 'reduced';
    warnings.push('Graph truth is partial; parse failures may hide affected files or symbols.');
    factors.push('Graph status is partial.');
  }

  if (staleGraph) {
    score += 15;
    confidence = 'reduced';
    warnings.push('Graph truth is stale relative to the current workspace; refresh before relying on precise routing.');
    factors.push('Graph metadata is stale.');
  }

  if (cycles.length > 0) {
    score += Math.min(cycles.length * 15, 30);
    factors.push(`${cycles.length} dependency cycle(s) detected.`);
  }

  if (metadata.failedFileCount > 0) {
    score += Math.min(metadata.failedFileCount * 5, 20);
    factors.push(`${metadata.failedFileCount} file(s) failed to parse in the current graph.`);
  }

  if (factors.length === 0) {
    factors.push('Graph metadata is available and no immediate cycle/parse-failure risk was detected.');
  }

  rationale.push(`Task route uses the static ${task} tool map validated against the live MCP tool catalog.`);
  rationale.push(`Detail level "${detailLevel}" controls whether warnings and focus areas are expanded.`);

  const executableTools = getExecutableToolCatalog();
  const requestedAllowedTools = input.allowedTools
    ?.filter((toolName, index, tools) => toolName.trim().length > 0 && tools.indexOf(toolName) === index);
  const mappedSuggestions = TASK_TOOL_MAP[task]
    .filter((suggestion) => executableTools.has(suggestion.tool));

  if (mappedSuggestions.length !== TASK_TOOL_MAP[task].length) {
    warnings.push('Some static tool suggestions were dropped because they are not executable in the current MCP catalog.');
  }

  let nextToolSuggestions = mappedSuggestions;
  if (graphStatus === 'missing') {
    nextToolSuggestions = mappedSuggestions.filter((suggestion) => suggestion.tool !== 'codemap_impact');
    nextToolSuggestions = [
      { tool: 'codemap_doctor', reason: '图缺失时先确认环境与生成前置条件。' },
      ...nextToolSuggestions.filter((suggestion) => suggestion.tool !== 'codemap_doctor'),
    ].slice(0, 3);
  }

  if (requestedAllowedTools) {
    const unsupportedFilterTools = requestedAllowedTools.filter((toolName) => !executableTools.has(toolName));
    if (unsupportedFilterTools.length > 0) {
      warnings.push(`Ignored non-executable filter entries: ${unsupportedFilterTools.join(', ')}.`);
    }

    const supportedAllowedTools = requestedAllowedTools.filter((toolName) => executableTools.has(toolName));
    const hiddenRequiredTools = nextToolSuggestions
      .map((suggestion) => suggestion.tool)
      .filter((toolName) => !supportedAllowedTools.includes(toolName));

    if (supportedAllowedTools.length === 0 || hiddenRequiredTools.length > 0) {
      return {
        status: 'invalid_input',
        confidence: 'unavailable',
        task,
        detailLevel,
        summary: '工具过滤器会隐藏当前路由必须暴露的建议。',
        ...buildGraphEnvelope(metadata),
        graphStats: {
          modules: metadata.moduleCount,
          symbols: metadata.symbolCount,
          edges: stats.totalDependencies,
          cycles: cycles.length,
        },
        riskSummary: {
          level: 'medium',
          score: Math.max(score, 55),
          factors: [
            'The supplied tool filter hides one or more required next-step suggestions.',
          ],
        },
        nextToolSuggestions: [],
        warnings: [
          `Blocked required suggestions: ${hiddenRequiredTools.join(', ') || 'all suggestions'}.`,
        ],
        error: {
          code: 'FILTER_CONFLICT',
          message: 'The supplied tool filter removes tool suggestions required by the current route.',
          details: {
            hiddenRequiredTools,
            allowedTools: supportedAllowedTools,
          },
        },
      };
    }

    nextToolSuggestions = nextToolSuggestions
      .filter((suggestion) => supportedAllowedTools.includes(suggestion.tool));
  }

  const level = deriveRiskLevel(score);
  const summaryByTask: Record<McpContextTask, string> = {
    review: '聚焦改动半径与高风险图信号，先看爆炸半径，再看分析结果。',
    debug: '聚焦故障定位顺序，先找符号，再顺着依赖链排查运行/环境问题。',
    default: '提供当前仓库的轻量图概览，并给出最直接的下一步工具入口。',
  };

  return {
    status: 'ok',
    confidence,
    task,
    detailLevel,
    summary: summaryByTask[task],
    ...buildGraphEnvelope(metadata),
    graphStats: {
      modules: metadata.moduleCount,
      symbols: metadata.symbolCount,
      edges: stats.totalDependencies,
      cycles: cycles.length,
    },
    riskSummary: {
      level,
      score,
      factors,
    },
    nextToolSuggestions,
    ...(detailLevel === 'standard'
      ? {
        warnings,
        rationale,
        focusAreas: buildFocusAreas(metadata.parseFailureFiles, cycles),
      }
      : {}),
  };
}
