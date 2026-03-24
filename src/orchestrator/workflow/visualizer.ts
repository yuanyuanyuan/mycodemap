/**
 * [META] 工作流可视化器
 * [WHY] 提供终端友好的工作流状态可视化，提升用户体验
 */

import type {
  WorkflowContext,
  WorkflowPhase,
  PhaseStatus,
  PhaseArtifacts,
  WorkflowStatus
} from './types.js';
import type { UnifiedResult } from '../types.js';

// ============================================
// 可视化配置
// ============================================

/** 阶段显示配置 */
interface PhaseDisplayConfig {
  label: string;
  icon: string;
  color: string;
}

/** 阶段显示映射 */
const PHASE_DISPLAY: Record<WorkflowPhase, PhaseDisplayConfig> = {
  find: { label: 'Find', icon: '🔍', color: '\x1b[34m' },
  read: { label: 'Read', icon: '📖', color: '\x1b[33m' },
  link: { label: 'Link', icon: '🔗', color: '\x1b[36m' },
  show: { label: 'Show', icon: '🧭', color: '\x1b[35m' }
};

/** 状态图标映射 */
const STATUS_ICONS: Record<PhaseStatus, string> = {
  pending: '⏳',
  running: '🔄',
  completed: '✅',
  verified: '🔒',
  skipped: '⏭️'
};

/** 重置颜色 */
const RESET = '\x1b[0m';

// ============================================
// 工作流可视化器类
// ============================================

export class WorkflowVisualizer {
  /**
   * 渲染完整的工作流状态
   */
  renderWorkflowStatus(context: WorkflowContext): string {
    const lines: string[] = [];
    
    // 头部
    lines.push(this.renderHeader());
    lines.push('');
    
    // 基本信息
    lines.push(this.renderBasicInfo(context));
    lines.push('');
    
    // 阶段流程图
    lines.push(this.renderPhaseDiagram(context));
    lines.push('');
    
    // 进度条
    lines.push(this.renderProgressBar(context));
    lines.push('');
    
    // 阶段详情
    lines.push(this.renderPhaseDetails(context));
    
    return lines.join('\n');
  }

  /**
   * 渲染工作流状态（简化版）
   */
  renderWorkflowStatusCompact(status: WorkflowStatus): string {
    if (!status.active) {
      return 'No active workflow.';
    }

    const lines: string[] = [];
    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║              [WORKFLOW STATUS]                          ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`Task: ${status.task}`);
    lines.push(`Phase: ${status.currentPhase} ${this.getPhaseIcon(status.currentPhase as WorkflowPhase)}`);
    lines.push(`Status: ${STATUS_ICONS[status.phaseStatus as PhaseStatus]} ${status.phaseStatus}`);
    lines.push(`Progress: ${this.renderProgressBarCompact(status.progress || 0)}`);
    lines.push('');
    lines.push(`Completed: ${status.artifacts?.join(', ') || 'none'}`);
    
    return lines.join('\n');
  }

  /**
   * 渲染阶段流程图
   */
  renderPhaseDiagram(context: WorkflowContext): string {
    const phases: WorkflowPhase[] = ['find', 'read', 'link', 'show'];
    const currentPhase = context.currentPhase;
    const artifacts = context.artifacts;
    
    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│                    WORKFLOW PIPELINE                     │');
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');
    
    // 渲染流程图
    const diagram: string[] = [];
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const config = PHASE_DISPLAY[phase];
      const isCurrent = phase === currentPhase;
      const isCompleted = artifacts.has(phase);
      
      let symbol: string;
      if (isCurrent) {
        symbol = `▶ ${config.icon}`;
      } else if (isCompleted) {
        symbol = `✓ ${config.icon}`;
      } else {
        symbol = `○ ${config.icon}`;
      }
      
      const label = isCurrent ? `【${config.label}】` : config.label;
      diagram.push(`${symbol} ${label}`);
      
      if (i < phases.length - 1) {
        diagram.push('  ↓');
      }
    }
    
    lines.push(diagram.join('\n'));
    
    return lines.join('\n');
  }

  /**
   * 渲染进度条
   */
  renderProgressBar(context: WorkflowContext): string {
    const totalPhases = 4;
    const completedPhases = context.artifacts.size;
    const progress = (completedPhases / totalPhases) * 100;
    
    const barLength = 40;
    const filledLength = Math.round((progress / 100) * barLength);
    const emptyLength = barLength - filledLength;
    
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    
    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│                      PROGRESS                           │');
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');
    lines.push(`[${filled}${empty}] ${progress.toFixed(0)}%`);
    lines.push(`${completedPhases}/${totalPhases} phases completed`);
    
    return lines.join('\n');
  }

  /**
   * 渲染阶段详情
   */
  renderPhaseDetails(context: WorkflowContext): string {
    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│                    PHASE DETAILS                         │');
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');
    
    for (const [phase, artifacts] of context.artifacts) {
      const config = PHASE_DISPLAY[phase];
      lines.push(`${config.icon} ${config.label} Phase`);
      lines.push(`   Status: ${STATUS_ICONS[context.phaseStatus]} ${context.phaseStatus}`);
      
      if (artifacts.results && artifacts.results.length > 0) {
        lines.push(`   Results: ${artifacts.results.length} items`);
      }
      
      if (artifacts.confidence) {
        const conf = artifacts.confidence;
        const icon = conf.level === 'high' ? '🟢' : conf.level === 'medium' ? '🟡' : '🔴';
        lines.push(`   Confidence: ${icon} ${(conf.score * 100).toFixed(0)}%`);
      }
      
      lines.push(`   Created: ${artifacts.createdAt.toLocaleString()}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * 渲染结果表格
   */
  renderResultsTable(results: UnifiedResult[], maxRows: number = 10): string {
    if (results.length === 0) {
      return 'No results to display.';
    }
    
    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────────────────────────────┐');
    lines.push('│                     ANALYSIS RESULTS                             │');
    lines.push('└─────────────────────────────────────────────────────────────────┘');
    lines.push('');
    
    // 表头
    lines.push('Rank │ File                    │ Score │ Type');
    lines.push('─────┼─────────────────────────┼───────┼─────────────────');
    
    // 数据行
    const displayResults = results.slice(0, maxRows);
    for (let i = 0; i < displayResults.length; i++) {
      const r = displayResults[i];
      const rank = (i + 1).toString().padStart(3);
      const file = (r.file || 'N/A').substring(0, 23).padEnd(23);
      // 使用 toolScore 或 relevance 作为分数
      const scoreValue = r.toolScore ?? r.relevance ?? 0;
      const score = (scoreValue * 100).toFixed(1).padStart(5);
      const type = (r.type || 'unknown').padEnd(16);
      
      lines.push(`${rank} │ ${file} │ ${score} │ ${type}`);
    }
    
    if (results.length > maxRows) {
      lines.push(`... and ${results.length - maxRows} more results`);
    }
    
    return lines.join('\n');
  }

  /**
   * 渲染工作流对比（用于模板比较）
   */
  renderWorkflowComparison(
    contexts: Array<{ name: string; context: WorkflowContext }>
  ): string {
    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│                 WORKFLOW COMPARISON                      │');
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');
    
    // 表头
    const nameWidth = Math.max(...contexts.map(c => c.name.length), 10);
    const header = `Workflow${' '.repeat(nameWidth - 8)} │ Phase      │ Progress │ Status`;
    lines.push(header);
    lines.push('─'.repeat(header.length));
    
    // 数据行
    for (const { name, context } of contexts) {
      const totalPhases = 4;
      const completedPhases = context.artifacts.size;
      const progress = (completedPhases / totalPhases) * 100;
      
      const nameCol = name.padEnd(nameWidth);
      const phaseCol = context.currentPhase.padEnd(10);
      const progressCol = `${progress.toFixed(0)}%`.padEnd(8);
      const statusCol = context.phaseStatus;
      
      lines.push(`${nameCol} │ ${phaseCol} │ ${progressCol} │ ${statusCol}`);
    }
    
    return lines.join('\n');
  }

  /**
   * 渲染时间线
   */
  renderTimeline(context: WorkflowContext): string {
    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│                    WORKFLOW TIMELINE                     │');
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');
    
    const startTime = context.startedAt.getTime();
    const endTime = context.updatedAt.getTime();
    const duration = endTime - startTime;
    
    lines.push(`Started:  ${context.startedAt.toLocaleString()}`);
    lines.push(`Updated:  ${context.updatedAt.toLocaleString()}`);
    lines.push(`Duration: ${this.formatDuration(duration)}`);
    lines.push('');
    
    // 阶段时间线
    const sortedArtifacts = Array.from(context.artifacts.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());
    
    for (const [phase, artifacts] of sortedArtifacts) {
      const config = PHASE_DISPLAY[phase];
      const elapsed = artifacts.createdAt.getTime() - startTime;
      const relativeTime = this.formatDuration(elapsed);
      lines.push(`${relativeTime.padStart(8)} ${config.icon} ${config.label}`);
    }
    
    return lines.join('\n');
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  private renderHeader(): string {
    return `
╔══════════════════════════════════════════════════════════╗
║              WORKFLOW VISUALIZATION                      ║
╚══════════════════════════════════════════════════════════╝`;
  }

  private renderBasicInfo(context: WorkflowContext): string {
    const lines: string[] = [];
    lines.push(`ID:     ${context.id}`);
    lines.push(`Task:   ${context.task}`);
    lines.push(`Phase:  ${this.getPhaseLabel(context.currentPhase)} ${this.getPhaseIcon(context.currentPhase)}`);
    lines.push(`Status: ${STATUS_ICONS[context.phaseStatus]} ${context.phaseStatus}`);
    return lines.join('\n');
  }

  private renderProgressBarCompact(progress: number): string {
    const barLength = 20;
    const filledLength = Math.round((progress / 100) * barLength);
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(barLength - filledLength);
    return `[${filled}${empty}] ${progress.toFixed(0)}%`;
  }

  private getPhaseIcon(phase: WorkflowPhase): string {
    return PHASE_DISPLAY[phase]?.icon || '❓';
  }

  private getPhaseLabel(phase: WorkflowPhase): string {
    return PHASE_DISPLAY[phase]?.label || phase;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

// ============================================
// 便捷函数
// ============================================

/** 创建可视化器实例 */
export function createVisualizer(): WorkflowVisualizer {
  return new WorkflowVisualizer();
}

/** 快速渲染工作流状态 */
export function visualizeWorkflow(context: WorkflowContext): string {
  const visualizer = createVisualizer();
  return visualizer.renderWorkflowStatus(context);
}

/** 快速渲染结果表格 */
export function visualizeResults(results: UnifiedResult[], maxRows?: number): string {
  const visualizer = createVisualizer();
  return visualizer.renderResultsTable(results, maxRows);
}
