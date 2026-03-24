/**
 * [META] 工作流模板系统
 * [WHY] 提供预定义的工作流模板，加速常见开发场景
 */

import { writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import type { PhaseDefinition, WorkflowPhase, PhaseAction, PhaseCondition } from './types.js';

/**
 * 路径兼容常量
 */
const DEFAULT_OUTPUT_DIR_NEW = '.mycodemap';
const DEFAULT_OUTPUT_DIR_OLD = '.codemap';

/**
 * 解析工作流目录路径
 */
function resolveWorkflowDir(): string {
  const rootDir = cwd();
  const newPath = join(rootDir, DEFAULT_OUTPUT_DIR_NEW, 'workflow');

  if (existsSync(newPath) || !existsSync(join(rootDir, DEFAULT_OUTPUT_DIR_OLD, 'workflow'))) {
    return join(DEFAULT_OUTPUT_DIR_NEW, 'workflow');
  }

  return join(DEFAULT_OUTPUT_DIR_OLD, 'workflow');
}

/**
 * 解析模板目录路径
 */
function resolveTemplatesDir(): string {
  const rootDir = cwd();
  const newPath = join(rootDir, DEFAULT_OUTPUT_DIR_NEW, 'templates');

  if (existsSync(newPath) || !existsSync(join(rootDir, DEFAULT_OUTPUT_DIR_OLD, 'templates'))) {
    return join(DEFAULT_OUTPUT_DIR_NEW, 'templates');
  }

  return join(DEFAULT_OUTPUT_DIR_OLD, 'templates');
}

/**
 * 获取工作流文件路径（用于模板定义）
 */
function wf(file: string): string {
  return join(resolveWorkflowDir(), file);
}

type AnalysisPhaseThresholds = Partial<Record<WorkflowPhase, number>>;

export function createWorkflowAnalysisPhases(
  thresholds: AnalysisPhaseThresholds = {}
): PhaseDefinition[] {
  return [
    {
      name: 'find',
      action: 'analyze' as PhaseAction,
      analyzeIntent: 'find',
      entryCondition: { minConfidence: thresholds.find ?? 0.3 } as PhaseCondition,
      deliverables: [
        { name: 'find-results', path: wf('find.json'), validator: () => true }
      ],
      nextPhase: 'read',
      commands: ['codemap analyze --intent find']
    },
    {
      name: 'read',
      action: 'analyze' as PhaseAction,
      analyzeIntent: 'read',
      entryCondition: { minConfidence: thresholds.read ?? 0.4 } as PhaseCondition,
      deliverables: [
        { name: 'read-results', path: wf('read.json'), validator: () => true }
      ],
      nextPhase: 'link',
      commands: ['codemap analyze --intent read']
    },
    {
      name: 'link',
      action: 'analyze' as PhaseAction,
      analyzeIntent: 'link',
      entryCondition: { minConfidence: thresholds.link ?? 0.35 } as PhaseCondition,
      deliverables: [
        { name: 'link-results', path: wf('link.json'), validator: () => true }
      ],
      nextPhase: 'show',
      commands: ['codemap analyze --intent link']
    },
    {
      name: 'show',
      action: 'analyze' as PhaseAction,
      analyzeIntent: 'show',
      entryCondition: { minConfidence: thresholds.show ?? 0.2 } as PhaseCondition,
      deliverables: [
        { name: 'show-results', path: wf('show.json'), validator: () => true }
      ],
      commands: ['codemap analyze --intent show']
    }
  ];
}

// ============================================
// 模板类型定义
// ============================================

/** 工作流模板类型 */
export type WorkflowTemplateType = 'refactoring' | 'bugfix' | 'feature' | 'hotfix' | 'custom';

/** 工作流模板接口 */
export interface WorkflowTemplate {
  /** 模板名称 */
  name: string;
  /** 模板类型 */
  type: WorkflowTemplateType;
  /** 模板描述 */
  description: string;
  /** 适用场景 */
  useCases: string[];
  /** 阶段定义 */
  phases: PhaseDefinition[];
  /** 模板版本 */
  version: string;
  /** 创建时间 */
  createdAt: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 模板保存配置 */
export interface TemplateSaveOptions {
  /** 覆盖已有模板 */
  overwrite?: boolean;
  /** 模板描述 */
  description?: string;
  /** 适用场景 */
  useCases?: string[];
}

/** 模板加载选项 */
export interface TemplateLoadOptions {
  /** 是否验证模板 */
  validate?: boolean;
}

// ============================================
// 预定义模板
// ============================================

/** 重构模板 - 用于代码重构任务 */
export const REFACTORING_TEMPLATE: WorkflowTemplate = {
  name: 'refactoring',
  type: 'refactoring',
  description: 'Standard workflow for code refactoring tasks with impact analysis',
  useCases: [
    'Extract method/class refactoring',
    'Rename refactoring',
    'Move refactoring',
    'Code structure improvement'
  ],
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  phases: createWorkflowAnalysisPhases()
};

/** Bug 修复模板 - 用于快速修复生产环境问题 */
export const BUGFIX_TEMPLATE: WorkflowTemplate = {
  name: 'bugfix',
  type: 'bugfix',
  description: 'Streamlined workflow for bug fixes with focused testing',
  useCases: [
    'Production bug fixes',
    'Critical issue resolution',
    'Regression fixes',
    'Security patches'
  ],
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  phases: createWorkflowAnalysisPhases({ find: 0.2, read: 0.3, link: 0.25, show: 0.15 })
};

/** 功能开发模板 - 用于新功能开发 */
export const FEATURE_TEMPLATE: WorkflowTemplate = {
  name: 'feature',
  type: 'feature',
  description: 'Complete workflow for new feature development',
  useCases: [
    'New feature implementation',
    'Major enhancements',
    'API additions',
    'UI/UX improvements'
  ],
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  phases: createWorkflowAnalysisPhases({ find: 0.4, read: 0.5, link: 0.4, show: 0.25 })
};

/** 热修复模板 - 用于紧急生产修复 */
export const HOTFIX_TEMPLATE: WorkflowTemplate = {
  name: 'hotfix',
  type: 'hotfix',
  description: 'Emergency workflow for critical production hotfixes',
  useCases: [
    'Critical production issues',
    'Security vulnerabilities',
    'Data corruption fixes',
    'Service outages'
  ],
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  phases: createWorkflowAnalysisPhases({ find: 0.1, read: 0.2, link: 0.2, show: 0.1 })
};

/** 所有预定义模板 */
export const BUILTIN_TEMPLATES: Record<string, WorkflowTemplate> = {
  refactoring: REFACTORING_TEMPLATE,
  bugfix: BUGFIX_TEMPLATE,
  feature: FEATURE_TEMPLATE,
  hotfix: HOTFIX_TEMPLATE
};

// ============================================
// 模板管理器
// ============================================

export class WorkflowTemplateManager {
  private templatesDir: string;
  private customTemplates: Map<string, WorkflowTemplate> = new Map();

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || resolveTemplatesDir();
  }

  /**
   * 获取预定义模板
   */
  getBuiltinTemplate(name: string): WorkflowTemplate | undefined {
    return BUILTIN_TEMPLATES[name];
  }

  /**
   * 获取所有预定义模板
   */
  getAllBuiltinTemplates(): WorkflowTemplate[] {
    return Object.values(BUILTIN_TEMPLATES);
  }

  /**
   * 获取自定义模板
   */
  getCustomTemplate(name: string): WorkflowTemplate | undefined {
    return this.customTemplates.get(name);
  }

  /**
   * 获取所有自定义模板
   */
  getAllCustomTemplates(): WorkflowTemplate[] {
    return Array.from(this.customTemplates.values());
  }

  /**
   * 获取所有可用模板（内置 + 自定义）
   */
  getAllTemplates(): WorkflowTemplate[] {
    return [
      ...this.getAllBuiltinTemplates(),
      ...this.getAllCustomTemplates()
    ];
  }

  /**
   * 获取模板（优先自定义，其次内置）
   */
  getTemplate(name: string): WorkflowTemplate | undefined {
    return this.getCustomTemplate(name) || this.getBuiltinTemplate(name);
  }

  /**
   * 检查模板是否存在
   */
  hasTemplate(name: string): boolean {
    return this.getTemplate(name) !== undefined;
  }

  /**
   * 保存自定义模板
   */
  async saveTemplate(
    template: WorkflowTemplate,
    options: TemplateSaveOptions = {}
  ): Promise<void> {
    // 检查是否覆盖内置模板
    if (BUILTIN_TEMPLATES[template.name] && !options.overwrite) {
      throw new Error(`Cannot overwrite builtin template: ${template.name}`);
    }

    // 更新元数据
    const templateToSave: WorkflowTemplate = {
      ...template,
      type: 'custom',
      description: options.description || template.description,
      useCases: options.useCases || template.useCases,
      version: this.incrementVersion(template.version),
      createdAt: new Date().toISOString()
    };

    // 保存到内存
    this.customTemplates.set(template.name, templateToSave);

    // 保存到文件
    await this.ensureTemplatesDir();
    const filePath = join(this.templatesDir, `${template.name}.json`);
    await writeFile(filePath, JSON.stringify(templateToSave, null, 2));
  }

  /**
   * 从当前阶段配置创建模板
   */
  async createTemplateFromPhases(
    name: string,
    phases: PhaseDefinition[],
    options: TemplateSaveOptions = {}
  ): Promise<WorkflowTemplate> {
    const template: WorkflowTemplate = {
      name,
      type: 'custom',
      description: options.description || `Custom template: ${name}`,
      useCases: options.useCases || ['Custom workflow'],
      phases,
      version: '1.0.0',
      createdAt: new Date().toISOString()
    };

    await this.saveTemplate(template, options);
    return template;
  }

  /**
   * 加载自定义模板
   */
  async loadCustomTemplates(): Promise<void> {
    try {
      await access(this.templatesDir);
    } catch {
      // 目录不存在，没有自定义模板
      return;
    }

    const { readdir } = await import('node:fs/promises');
    const files = await readdir(this.templatesDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = join(this.templatesDir, file);
          const content = await readFile(filePath, 'utf-8');
          const template: WorkflowTemplate = JSON.parse(content);
          
          if (this.validateTemplate(template)) {
            this.customTemplates.set(template.name, template);
          }
        } catch (error) {
          console.warn(`Failed to load template from ${file}:`, error);
        }
      }
    }
  }

  /**
   * 删除自定义模板
   */
  async deleteTemplate(name: string): Promise<boolean> {
    // 不能删除内置模板
    if (BUILTIN_TEMPLATES[name]) {
      return false;
    }

    const deleted = this.customTemplates.delete(name);
    
    if (deleted) {
      try {
        const filePath = join(this.templatesDir, `${name}.json`);
        const { unlink } = await import('node:fs/promises');
        await unlink(filePath);
      } catch {
        // 文件可能不存在，忽略错误
      }
    }

    return deleted;
  }

  /**
   * 验证模板
   */
  validateTemplate(template: unknown): template is WorkflowTemplate {
    if (!template || typeof template !== 'object') {
      return false;
    }

    const t = template as Partial<WorkflowTemplate>;
    
    return (
      typeof t.name === 'string' &&
      typeof t.type === 'string' &&
      Array.isArray(t.phases) &&
      t.phases.length > 0 &&
      t.phases.every(p => 
        typeof p.name === 'string' &&
        typeof p.action === 'string' &&
        typeof p.entryCondition === 'object'
      )
    );
  }

  /**
   * 渲染模板信息
   */
  renderTemplateInfo(template: WorkflowTemplate): string {
    const lines: string[] = [];
    lines.push(`Template: ${template.name}`);
    lines.push(`Type: ${template.type}`);
    lines.push(`Version: ${template.version}`);
    lines.push(`Description: ${template.description}`);
    lines.push('');
    lines.push('Use Cases:');
    for (const useCase of template.useCases) {
      lines.push(`  • ${useCase}`);
    }
    lines.push('');
    lines.push('Phases:');
    for (const phase of template.phases) {
      const nextPhase = phase.nextPhase ? ` → ${phase.nextPhase}` : '';
      lines.push(`  ${phase.name} (${phase.action})${nextPhase}`);
    }
    
    return lines.join('\n');
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  private async ensureTemplatesDir(): Promise<void> {
    try {
      await mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      // 目录可能已存在
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0', 10);
    parts[2] = (patch + 1).toString();
    return parts.join('.');
  }
}

// ============================================
// 便捷函数
// ============================================

/** 创建模板管理器 */
export function createTemplateManager(templatesDir?: string): WorkflowTemplateManager {
  return new WorkflowTemplateManager(templatesDir);
}

/** 获取默认模板 */
export function getDefaultTemplate(): WorkflowTemplate {
  return REFACTORING_TEMPLATE;
}

/** 根据任务描述推荐模板 */
export function recommendTemplate(taskDescription: string): WorkflowTemplate {
  const lowerTask = taskDescription.toLowerCase();
  
  if (lowerTask.includes('bug') || lowerTask.includes('fix') || lowerTask.includes('error')) {
    if (lowerTask.includes('hotfix') || lowerTask.includes('urgent') || lowerTask.includes('critical')) {
      return HOTFIX_TEMPLATE;
    }
    return BUGFIX_TEMPLATE;
  }
  
  if (lowerTask.includes('feature') || lowerTask.includes('add') || lowerTask.includes('implement')) {
    return FEATURE_TEMPLATE;
  }
  
  if (lowerTask.includes('refactor') || lowerTask.includes('restructure') || lowerTask.includes('clean')) {
    return REFACTORING_TEMPLATE;
  }
  
  // 默认返回重构模板
  return REFACTORING_TEMPLATE;
}
