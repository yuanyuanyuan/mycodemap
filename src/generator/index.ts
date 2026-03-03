// [META] since:2024-03 | owner:core-team | stable:true
// [WHY] 代码地图生成器模块，负责将分析结果转换为各种输出格式
import fs from 'fs/promises';
import path from 'path';
import type { CodeMap, VisualizationConfig, MermaidConfig } from '../types/index.js';
import { generateAllContexts } from './context.js';
import { createFileDescriber, type FileDescription, type FileDescriberConfig } from './file-describer.js';

// 导出文件描述器相关类型和函数
export type { FileDescription, FileDescriberConfig } from './file-describer.js';
export { createFileDescriber, FileDescriber } from './file-describer.js';

// 默认可视化配置
const defaultVisualizationConfig: VisualizationConfig = {
  mermaid: {
    graphType: 'flowchart',
    direction: 'LR',
    nodeShape: 'box',
    showLabels: true,
    maxNodes: 50,
    maxEdges: 100
  },
  includeTestFiles: false,
  includeExternalDeps: false,
  showComplexity: false,
  outputFormat: 'markdown'
};

// 生成 Mermaid 依赖图
function generateMermaidDependencyGraph(
  codeMap: CodeMap,
  config: MermaidConfig
): string {
  const lines: string[] = [];

  const graphType = config.graphType === 'mindmap' ? 'mindmap' : 'flowchart';
  lines.push(`\`\`\`mermaid`);
  lines.push(`${graphType} ${config.direction}`);

  // 定义节点样式
  lines.push('  classDef core fill:#f9f,stroke:#333,stroke-width:2px');
  lines.push('  classDef feature fill:#bbf,stroke:#333,stroke-width:2px');
  lines.push('  classDef utility fill:#bfb,stroke:#333,stroke-width:2px');
  lines.push('  classDef external fill:#fbb,stroke:#333,stroke-width:2px');
  lines.push('  classDef entry fill:#ff9,stroke:#333,stroke-width:4px');
  lines.push('');

  // 分类节点
  const categories: Record<string, string[]> = {
    core: [],
    feature: [],
    utility: [],
    external: [],
    entry: []
  };

  for (const node of codeMap.dependencies.nodes) {
    if (categories[node.category]) {
      const label = path.basename(node.path, '.ts');
      categories[node.category].push(`${node.id}["${label}"]`);
    }
  }

  // 添加入口点
  const entryPoints = codeMap.modules.filter(m => {
    const basename = path.basename(m.path);
    return basename === 'index.ts' || basename === 'main.ts' || basename === 'app.ts';
  });
  for (const ep of entryPoints) {
    categories.entry.push(`${ep.id}["${path.basename(ep.path, '.ts')}"]`);
  }

  // 输出节点（限制数量）
  let nodeCount = 0;
  for (const [category, nodes] of Object.entries(categories)) {
    if (nodes.length === 0) continue;

    lines.push(`  %% ${category} modules`);
    for (const node of nodes.slice(0, Math.floor(config.maxNodes / 5))) {
      if (nodeCount >= config.maxNodes) break;
      lines.push(`  ${node}:::${category === 'entry' ? 'entry' : category}`);
      nodeCount++;
    }
  }

  lines.push('');

  // 输出边（限制数量）
  let edgeCount = 0;
  const edgeSet = new Set<string>();
  for (const edge of codeMap.dependencies.edges) {
    if (edgeCount >= config.maxEdges) break;

    const key = `${edge.from}-->${edge.to}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    let label = '';
    if (config.showLabels) {
      switch (edge.type) {
        case 'import': label = 'import'; break;
        case 'inherit': label = 'extends'; break;
        case 'implement': label = 'implements'; break;
        case 'call': label = 'calls'; break;
        case 'type-ref': label = 'type'; break;
      }
    }

    const edgeStyle = edge.type === 'inherit' || edge.type === 'implement' ? '-.->' : '-->';
    if (label) {
      lines.push(`  ${edge.from} ${edgeStyle} ${edge.to} |${label}|`);
    } else {
      lines.push(`  ${edge.from} ${edgeStyle} ${edge.to}`);
    }
    edgeCount++;
  }

  lines.push('```');

  return lines.join('\n');
}

// 生成类型信息摘要
function generateTypeInfoSummary(codeMap: CodeMap): string {
  const lines: string[] = [];

  // 收集类型信息
  const typeDefs = new Map<string, number>();
  const interfaces: string[] = [];
  const classes: string[] = [];
  const types: string[] = [];

  for (const mod of codeMap.modules) {
    if (mod.symbols) {
      for (const sym of mod.symbols) {
        const count = typeDefs.get(sym.kind) || 0;
        typeDefs.set(sym.kind, count + 1);

        if (sym.kind === 'interface') interfaces.push(sym.name);
        else if (sym.kind === 'class') classes.push(sym.name);
        else if (sym.kind === 'type') types.push(sym.name);
      }
    }
  }

  if (typeDefs.size > 0) {
    lines.push('### Type Summary');
    lines.push('');
    lines.push('| Type Kind | Count |');
    lines.push('|-----------|-------|');
    for (const [kind, count] of typeDefs) {
      lines.push(`| ${kind} | ${count} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// 生成 AI_MAP.md
export async function generateAIMap(
  codeMap: CodeMap,
  outputDir: string,
  visualizationConfig?: Partial<VisualizationConfig>
): Promise<void> {
  const config = { ...defaultVisualizationConfig, ...visualizationConfig };
  const lines: string[] = [];

  // 头部
  lines.push('# AI Code Map');
  lines.push('');
  lines.push(`> Generated at: ${codeMap.generatedAt}`);
  lines.push('');
  const mode = codeMap.actualMode || 'fast';
  lines.push(`> Mode: ${mode === 'smart' ? 'Smart' : 'Fast'}`);
  lines.push('');

  // 项目概览
  lines.push('## Project Overview');
  lines.push('');
  lines.push(`- **Project Name**: ${codeMap.project.name}`);
  lines.push(`- **Total Files**: ${codeMap.summary.totalFiles}`);
  lines.push(`- **Total Lines**: ${codeMap.summary.totalLines}`);
  lines.push(`- **Total Modules**: ${codeMap.summary.totalModules}`);
  lines.push(`- **Total Exports**: ${codeMap.summary.totalExports}`);
  lines.push(`- **Total Types**: ${codeMap.summary.totalTypes}`);
  lines.push('');

  // 入口点
  const entryPoints = codeMap.modules.filter(m => {
    const basename = path.basename(m.path);
    return basename === 'index.ts' || basename === 'main.ts' || basename === 'app.ts';
  });

  if (entryPoints.length > 0) {
    lines.push('## Entry Points');
    lines.push('');
    for (const ep of entryPoints) {
      lines.push(`- \`${path.relative(codeMap.project.rootDir, ep.path)}\``);
    }
    lines.push('');
  }

  // 模块组织
  lines.push('## Module Organization');
  lines.push('');
  lines.push('| Module | Exports | Dependencies | Type |');
  lines.push('|--------|---------|--------------|------|');

  const displayModules = config.includeTestFiles
    ? codeMap.modules
    : codeMap.modules.filter(m => m.type !== 'test');

  for (const mod of displayModules.slice(0, 50)) {
    const relPath = path.relative(codeMap.project.rootDir, mod.path);
    lines.push(`| ${relPath} | ${mod.exports.length} | ${mod.dependencies.length} | ${mod.type} |`);
  }

  if (displayModules.length > 50) {
    lines.push(`| ... | ... | ... | ... |`);
  }

  lines.push('');

  // 依赖关系 - 使用增强的 Mermaid 图
  lines.push('## Dependencies');
  lines.push('');
  lines.push(generateMermaidDependencyGraph(codeMap, config.mermaid));
  lines.push('');

  // 类型信息摘要
  lines.push(generateTypeInfoSummary(codeMap));

  // 导出符号统计
  lines.push('## Exports Summary');
  lines.push('');
  const exportCounts = new Map<string, number>();
  for (const mod of codeMap.modules) {
    for (const exp of mod.exports) {
      exportCounts.set(exp.name, (exportCounts.get(exp.name) || 0) + 1);
    }
  }

  // 列出被多个模块导出的符号
  const multiExport = Array.from(exportCounts.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (multiExport.length > 0) {
    lines.push('### Shared Exports');
    lines.push('');
    for (const [name, count] of multiExport) {
      lines.push(`- \`${name}\` (${count} modules)`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generated by CodeMap*');

  // 写入文件
  const outputPath = path.join(outputDir, 'AI_MAP.md');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, lines.join('\n'));
}

// 生成独立的 Mermaid 依赖图文件
export async function generateMermaidGraph(
  codeMap: CodeMap,
  outputDir: string,
  config?: Partial<MermaidConfig>
): Promise<void> {
  const mermaidConfig: MermaidConfig = {
    graphType: config?.graphType || 'flowchart',
    direction: config?.direction || 'LR',
    nodeShape: config?.nodeShape || 'box',
    showLabels: config?.showLabels ?? true,
    maxNodes: config?.maxNodes || 50,
    maxEdges: config?.maxEdges || 100
  };

  const graphContent = generateMermaidDependencyGraph(codeMap, mermaidConfig);

  const outputPath = path.join(outputDir, 'dependency-graph.md');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, graphContent);
}

// 生成 codemap.json
export async function generateJSON(codeMap: CodeMap, outputDir: string): Promise<void> {
  const outputPath = path.join(outputDir, 'codemap.json');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(codeMap, null, 2));
}

// 生成所有文件的 CONTEXT.md
export async function generateContext(codeMap: CodeMap, outputDir: string): Promise<void> {
  await generateAllContexts(codeMap.modules, codeMap.project.rootDir, outputDir);
}
