// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Human-readable output formatting for codemap preview — renders the four-section
// summary as a table/color console output.

import chalk from 'chalk';

export interface PreviewData {
  projectType: string;
  profile: string;
  files: {
    total: number;
    byExtension: Record<string, number>;
  };
  modules: {
    count: number;
    top: string[];
  };
  dependencies: {
    direct: string[];
    count: number;
  };
  complexity: {
    hotspots: Array<{
      file: string;
      score: number;
      functions: number;
    }>;
  };
  hint: string;
}

/**
 * Format preview data as human-readable output with chalk colors.
 *
 * Renders four sections (files, modules, dependencies, complexity hotspots)
 * and always appends the hint text at the end (per D-10).
 */
export function formatPreviewHuman(data: PreviewData): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.cyan.bold('CodeMap Preview'));
  lines.push('');

  // Project type & profile
  lines.push(chalk.white('Project: ') + `${data.projectType} (profile: ${data.profile})`);
  lines.push('');

  // Files section
  const extBreakdown = Object.entries(data.files.byExtension)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `${ext.toUpperCase().replace('.', '')}: ${count}`)
    .join(', ');
  lines.push(chalk.blue('Files: ') + `${data.files.total} total source files` +
    (extBreakdown ? ` (${extBreakdown})` : ''));
  lines.push('');

  // Modules section
  const topDirs = data.modules.top.length > 0
    ? data.modules.top.join(', ')
    : 'none';
  lines.push(chalk.blue('Modules: ') + `${data.modules.count} modules — ${topDirs}`);
  lines.push('');

  // Dependencies section
  const depDisplay = data.dependencies.count > 0
    ? `${data.dependencies.count} direct dependencies — ${data.dependencies.direct.slice(0, 10).join(', ')}`
    : 'none detected';
  lines.push(chalk.blue('Dependencies: ') + depDisplay);
  lines.push('');

  // Complexity hotspots section
  lines.push(chalk.blue('Complexity hotspots:'));
  if (data.complexity.hotspots.length === 0) {
    lines.push(chalk.gray('  (no JS/TS files found for complexity analysis)'));
  } else {
    data.complexity.hotspots.forEach((hotspot, i) => {
      lines.push(`  ${i + 1}. ${chalk.white(hotspot.file)} (score=${hotspot.score}, functions=${hotspot.functions})`);
    });
  }
  lines.push('');

  // Hint (always appended per D-10)
  lines.push(chalk.gray(data.hint));

  return lines.join('\n');
}
