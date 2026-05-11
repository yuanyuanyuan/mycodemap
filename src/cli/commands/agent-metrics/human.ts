// [META] since:2026-05-10 | owner:cli-team | stable:false
// [WHY] Human renderer for agent-metrics outputs while keeping shared output mode as the primary surface

import type {
  AgentMetricsGateResult,
  AgentMetricsReportResult,
  AgentMetricsTokenRunResult,
} from '../../../orchestrator/agent-metrics-service.js';

function formatTotals(totals: AgentMetricsTokenRunResult['totals']): string[] {
  return [
    `Queries: ${totals.queryCount}`,
    `Response bytes: ${totals.responseSizeBytes}`,
    `Raw chars: ${totals.rawCharCount}`,
    `Estimated input tokens: ${totals.estimatedInputTokens}`,
    `Estimated output tokens: ${totals.estimatedOutputTokens}`,
    `Estimated total tokens: ${totals.estimatedTotalTokens}`,
    `Execution time: ${totals.executionTimeMs}ms`,
  ];
}

function formatTable(headers: string[], rows: string[][]): string[] {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
  );

  const formatRow = (row: string[]): string =>
    row.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join(' | ');

  return [
    formatRow(headers),
    widths.map((width) => '-'.repeat(width)).join('-|-'),
    ...rows.map((row) => formatRow(row)),
  ];
}

function formatGateBlock(gate: AgentMetricsGateResult): string[] {
  const lines: string[] = ['Gate:'];

  if (gate.warnOnly) {
    lines.push('verdict=warn warn_only=true threshold=none');
    lines.push('No default calibrated threshold yet; showing the worst observed row only.');
    if (gate.maxRow) {
      lines.push(
        `Worst row: ${gate.maxRow.queryType} | ${gate.maxRow.commandSlug} | est_total=${gate.maxRow.estimatedTotalTokens}`,
      );
    }
    return lines;
  }

  lines.push(
    `verdict=${gate.verdict} warn_only=false threshold=${gate.threshold ?? 'none'} violation_count=${gate.violationCount}`,
  );
  if (gate.maxRow) {
    lines.push(
      `Worst row: ${gate.maxRow.queryType} | ${gate.maxRow.commandSlug} | est_total=${gate.maxRow.estimatedTotalTokens}`,
    );
  }
  if (gate.violations.length > 0) {
    lines.push('Violations:');
    for (const violation of gate.violations.slice(0, 3)) {
      lines.push(
        `- ${violation.queryType} | ${violation.commandSlug} | est_total=${violation.estimatedTotalTokens}`,
      );
    }
  }

  return lines;
}

export function formatAgentMetricsTokenRunHuman(result: AgentMetricsTokenRunResult): string {
  const lines: string[] = [
    'Agent Metrics Token Run',
    `Run ID: ${result.runId}`,
    `Recorded: ${result.recordedAt}`,
    `Sample set: ${result.sampleSetVersion}`,
    `Estimator: ${result.estimatorVersion} (estimated values, not tokenizer-exact)`,
    '',
    'Per-query results:',
  ];

  for (const item of result.items) {
    lines.push(
      `- ${item.queryType} | ${item.commandSlug}`,
      `  bytes=${item.responseSizeBytes} chars=${item.rawCharCount} est_in=${item.estimatedInputTokens} est_out=${item.estimatedOutputTokens} est_total=${item.estimatedTotalTokens} time=${item.executionTimeMs}ms`,
    );
  }

  lines.push('', 'Totals:');
  lines.push(...formatTotals(result.totals));
  return lines.join('\n');
}

export function formatAgentMetricsReportHuman(result: AgentMetricsReportResult): string {
  const lines: string[] = [
    'Agent Metrics Report',
    `Run ID: ${result.runId}`,
    `Recorded: ${result.recordedAt}`,
    `Generated: ${result.generatedAt}`,
    `Sample set: ${result.sampleSetVersion}`,
    `Estimator: ${result.estimatorVersion} (estimated values, not tokenizer-exact)`,
    '',
    'Summary:',
  ];

  lines.push(...formatGateBlock(result.gate));
  lines.push(...formatTotals(result.totals));

  lines.push('', 'By query type:');
  lines.push(...formatTable(
    ['Query type', 'Count', 'Hist', 'Avg tok', 'P50 tok', 'P95 tok', 'Max tok', 'Avg bytes', 'Min bytes', 'Max bytes'],
    result.queryTypeSummaries.map((summary) => [
      summary.queryType,
      String(summary.queryCount),
      String(summary.historicalSampleCount),
      String(summary.avgEstimatedTotalTokens),
      String(summary.p50EstimatedTotalTokens),
      String(summary.p95EstimatedTotalTokens),
      String(summary.maxEstimatedTotalTokens),
      String(summary.avgResponseSizeBytes),
      String(summary.minResponseSizeBytes),
      String(summary.maxResponseSizeBytes),
    ]),
  ));

  lines.push('', 'Per-query rows:');
  lines.push(...formatTable(
    ['Query type', 'Command', 'Bytes', 'Chars', 'Est in', 'Est out', 'Est total', 'Time'],
    result.rows.map((row) => [
      row.queryType,
      row.commandSlug,
      String(row.responseSizeBytes),
      String(row.rawCharCount),
      String(row.estimatedInputTokens),
      String(row.estimatedOutputTokens),
      String(row.estimatedTotalTokens),
      `${row.executionTimeMs}ms`,
    ]),
  ));

  lines.push('', 'Trend vs previous run:');
  if (result.queryTypeTrends.length === 0) {
    lines.push('- none');
  } else {
    for (const trend of result.queryTypeTrends.slice(0, 3)) {
      const previous = trend.previousEstimatedTotalTokens ?? 'none';
      const delta = trend.deltaEstimatedTotalTokens ?? 'none';
      const deltaPercent = trend.deltaPercent === null ? 'none' : `${trend.deltaPercent}%`;
      lines.push(
        `- ${trend.queryType} | latest=${trend.latestEstimatedTotalTokens} previous=${previous} delta=${delta} delta_percent=${deltaPercent}`,
      );
      if (!trend.baselineAvailable) {
        lines.push('  Baseline unavailable for comparison.');
      }
    }
  }

  lines.push('', 'Highest cost query types:');
  if (result.highestCostQueryTypes.length === 0) {
    lines.push('- none');
  } else {
    for (const item of result.highestCostQueryTypes.slice(0, 3)) {
      lines.push(
        `- ${item.queryType} | est_total=${item.estimatedTotalTokens} | ${item.riskNote}`,
      );
    }
  }

  lines.push('', 'Highest cost samples:');
  if (result.highestCostRows.length === 0) {
    lines.push('- none');
  } else {
    for (const item of result.highestCostRows.slice(0, 3)) {
      lines.push(
        `- ${item.queryType} | ${item.commandSlug} | est_total=${item.estimatedTotalTokens} | ${item.riskNote}`,
      );
    }
  }

  return lines.join('\n');
}
