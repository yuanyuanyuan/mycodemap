// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Workflow CLI commands for managing refactoring workflows with error code support

/**
 * Workflow CLI 命令
 * 工作流管理命令：start, status, proceed, resume, checkpoint, visualize, template
 */

import { Command } from 'commander';
import { WorkflowOrchestrator } from '../../orchestrator/workflow/workflow-orchestrator.js';
import { WorkflowVisualizer } from '../../orchestrator/workflow/visualizer.js';
import { WorkflowTemplateManager, recommendTemplate, type WorkflowTemplate } from '../../orchestrator/workflow/templates.js';
import type { AnalyzeArgs } from '../../orchestrator/types.js';

/**
 * Workflow 命令错误码
 */
export enum WorkflowErrorCode {
  E0011_WORKFLOW_NOT_FOUND = 'E0011',
  E0012_INVALID_WORKFLOW_STATE = 'E0012',
  E0013_CHECKPOINT_VALIDATION_FAILED = 'E0013',
  E0014_WORKFLOW_CREATION_FAILED = 'E0014',
  E0015_WORKFLOW_PERSISTENCE_FAILED = 'E0015',
  E0016_TEMPLATE_NOT_FOUND = 'E0016',
  E0017_TEMPLATE_INVALID = 'E0017',
}

/**
 * Workflow 命令错误信息
 */
export const ERROR_MESSAGES: Record<WorkflowErrorCode, string> = {
  [WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND]: '工作流ID不存在',
  [WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE]: '工作流状态无效（无法执行当前操作）',
  [WorkflowErrorCode.E0013_CHECKPOINT_VALIDATION_FAILED]: '阶段检查点验证失败',
  [WorkflowErrorCode.E0014_WORKFLOW_CREATION_FAILED]: '工作流创建失败',
  [WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED]: '工作流持久化失败',
  [WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND]: '模板不存在',
  [WorkflowErrorCode.E0017_TEMPLATE_INVALID]: '模板格式无效',
};

/**
 * 创建错误对象
 */
function createError(code: WorkflowErrorCode, message?: string): Error {
  const errorMessage = message || ERROR_MESSAGES[code];
  const error = new Error(`[${code}] ${errorMessage}`) as Error & { code: WorkflowErrorCode };
  error.code = code;
  return error;
}

const workflow = new Command('workflow');
workflow.description('Workflow management - manage development workflow across multiple phases');

/**
 * 启动新工作流
 */
workflow.command('start')
  .description('Start a new development workflow')
  .argument('<task>', 'Task description')
  .option('-t, --template <name>', 'Use workflow template (refactoring|bugfix|feature|hotfix)')
  .action(async (task: string, options: { template?: string }) => {
    try {
      const orchestrator = new WorkflowOrchestrator();
      const templateManager = new WorkflowTemplateManager();
      await templateManager.loadCustomTemplates();

      let selectedTemplate: WorkflowTemplate | undefined;
      if (options.template) {
        selectedTemplate = templateManager.getTemplate(options.template);
        if (!selectedTemplate) {
          throw createError(
            WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND,
            `${ERROR_MESSAGES[WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND]}: ${options.template}`
          );
        }
        if (!templateManager.validateTemplate(selectedTemplate)) {
          throw createError(
            WorkflowErrorCode.E0017_TEMPLATE_INVALID,
            `${ERROR_MESSAGES[WorkflowErrorCode.E0017_TEMPLATE_INVALID]}: ${options.template}`
          );
        }
      }

      const context = await orchestrator.start(task, {
        template: selectedTemplate?.name
      });
      
      let templateNote = '';
      if (selectedTemplate) {
        templateNote = `\nUsing template: ${selectedTemplate.name} (${selectedTemplate.type})`;
      } else {
        const recommended = recommendTemplate(task);
        templateNote = `\nRecommended template: ${recommended.name} (use --template ${recommended.name})`;
      }

      console.log(`
╔══════════════════════════════════════════════════════════╗
║              [WORKFLOW STARTED]                          ║
╚══════════════════════════════════════════════════════════╝

Task: ${task}
ID: ${context.id}
Phase: ${context.currentPhase}${templateNote}

Next steps:
  1. codemap workflow status        # 查看当前状态
  2. codemap workflow visualize     # 可视化工作流
  3. codemap analyze --intent reference --keywords ...
  4. codemap workflow proceed       # 进入下一阶段
`);
    } catch (error) {
      const err = error as Error & { code?: WorkflowErrorCode };
      const errMsg = error instanceof Error ? error.message : String(error);
      if (err.code === WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND) {
        console.error(`❌ ${errMsg}`);
        process.exit(1);
      }
      if (err.code === WorkflowErrorCode.E0017_TEMPLATE_INVALID) {
        console.error(`❌ ${errMsg}`);
        process.exit(1);
      }
      if (errMsg.startsWith('Template not found:')) {
        console.error(`❌ [${WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND}] ${ERROR_MESSAGES[WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND]}: ${errMsg.replace('Template not found: ', '')}`);
        process.exit(1);
      }
      if (errMsg.startsWith('Template invalid:')) {
        console.error(`❌ [${WorkflowErrorCode.E0017_TEMPLATE_INVALID}] ${ERROR_MESSAGES[WorkflowErrorCode.E0017_TEMPLATE_INVALID]}: ${errMsg.replace('Template invalid: ', '')}`);
        process.exit(1);
      }
      console.error(`❌ [${WorkflowErrorCode.E0014_WORKFLOW_CREATION_FAILED}] ${ERROR_MESSAGES[WorkflowErrorCode.E0014_WORKFLOW_CREATION_FAILED]}: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 查看工作流状态
 */
workflow.command('status')
  .description('Show current workflow status')
  .action(async () => {
    try {
      const orchestrator = new WorkflowOrchestrator();
      const status = await orchestrator.getStatus();

      if (!status.active) {
        console.log('No active workflow. Run "codemap workflow start <task>" first.');
        return;
      }

      const visualizer = new WorkflowVisualizer();
      const output = visualizer.renderWorkflowStatusCompact(status);
      console.log(output);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED}] ${ERROR_MESSAGES[WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED]}: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 推进到下一阶段
 */
workflow.command('proceed')
  .description('Proceed to next phase')
  .option('-f, --force', 'Skip verification')
  .action(async (options) => {
    try {
      const orchestrator = new WorkflowOrchestrator();
      const status = await orchestrator.getStatus();

      if (!status.active) {
        console.log('No active workflow. Run "codemap workflow start <task>" first.');
        return;
      }

      if (status.phaseStatus !== 'completed' && status.phaseStatus !== 'verified' && !options.force) {
        console.error(`❌ [${WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE}] ${ERROR_MESSAGES[WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE]}: Current phase ${status.currentPhase} is not completed (status: ${status.phaseStatus}). Use --force to override.`);
        process.exit(1);
      }

      const next = await orchestrator.proceedToNextPhase(options.force);

      console.log(`
╔══════════════════════════════════════════════════════════╗
║              [PHASE COMPLETED]                          ║
╚══════════════════════════════════════════════════════════╝

Current phase: ${status.currentPhase}
Status: ${status.phaseStatus}
Next phase: ${next}

Type "codemap workflow proceed" to continue to next phase.
`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE}] ${ERROR_MESSAGES[WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE]}: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 恢复工作流
 */
workflow.command('resume')
  .description('Resume an interrupted workflow')
  .argument('[id]', 'Workflow ID (optional, defaults to active)')
  .action(async (id?: string) => {
    try {
      const orchestrator = new WorkflowOrchestrator();

      if (id) {
        const context = await orchestrator.resume(id);
        if (!context) {
          console.error(`❌ [${WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND}] ${ERROR_MESSAGES[WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND]}: ${id}`);
          process.exit(1);
        }
        console.log(`Resumed workflow: ${context.id}`);
      } else {
        const context = await orchestrator.resumeActive();
        if (!context) {
          console.log('No active workflow to resume.');
          return;
        }
        console.log(`Resumed workflow: ${context.id}`);
      }

      const status = await orchestrator.getStatus();
      console.log(`
Phase: ${status.currentPhase}
Status: ${status.phaseStatus}
Progress: ${status.progress?.toFixed(0) || 0}%
`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE}] ${ERROR_MESSAGES[WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE]}: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 创建检查点
 */
workflow.command('checkpoint')
  .description('Create a checkpoint of current workflow state')
  .action(async () => {
    try {
      const orchestrator = new WorkflowOrchestrator();

      // 先加载活动工作流
      const status = await orchestrator.getStatus();
      if (!status.active) {
        console.log('No active workflow. Run "codemap workflow start <task>" first.');
        return;
      }

      await orchestrator.checkpoint();
      console.log('Checkpoint created successfully.');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${WorkflowErrorCode.E0013_CHECKPOINT_VALIDATION_FAILED}] ${ERROR_MESSAGES[WorkflowErrorCode.E0013_CHECKPOINT_VALIDATION_FAILED]}: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 列出所有工作流
 */
workflow.command('list')
  .description('List all workflows')
  .action(async () => {
    try {
      const orchestrator = new WorkflowOrchestrator();
      const workflows = await orchestrator.listWorkflows() as Array<{id: string; task: string; currentPhase: string; phaseStatus: string; updatedAt: string}>;

      if (workflows.length === 0) {
        console.log('No workflows found.');
        return;
      }

      console.log(`
╔══════════════════════════════════════════════════════════╗
║              [WORKFLOWS]                               ║
╚══════════════════════════════════════════════════════════╝
`);

      for (const wf of workflows) {
        console.log(`ID: ${wf.id}`);
        console.log(`  Task: ${wf.task}`);
        console.log(`  Phase: ${wf.currentPhase} (${wf.phaseStatus})`);
        console.log(`  Updated: ${wf.updatedAt}`);
        console.log('');
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED}] ${ERROR_MESSAGES[WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED]}: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 删除工作流
 */
workflow.command('delete')
  .description('Delete a workflow')
  .argument('<id>', 'Workflow ID')
  .action(async (id: string) => {
    try {
      const orchestrator = new WorkflowOrchestrator();

      // 先检查工作流是否存在
      const allWorkflows = await orchestrator.listWorkflows() as Array<{id: string}>;
      const exists = allWorkflows.some(wf => wf.id === id);

      if (!exists) {
        console.error(`❌ [${WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND}] ${ERROR_MESSAGES[WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND]}: ${id}`);
        process.exit(1);
      }

      await orchestrator.deleteWorkflow(id);
      console.log(`Workflow ${id} deleted.`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED}] ${ERROR_MESSAGES[WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED]}: ${errMsg}`);
      process.exit(1);
    }
  });

// ============================================
// 可视化命令 (T009)
// ============================================

/**
 * 可视化工作流
 */
workflow.command('visualize')
  .description('Visualize workflow with ASCII charts (T009)')
  .argument('[id]', 'Workflow ID (optional, defaults to active)')
  .option('-t, --timeline', 'Show timeline view')
  .option('-r, --results', 'Show results table')
  .action(async (id: string | undefined, options: { timeline?: boolean; results?: boolean }) => {
    try {
      const orchestrator = new WorkflowOrchestrator();
      const visualizer = new WorkflowVisualizer();

      // 加载工作流
      let context;
      if (id) {
        context = await orchestrator.resume(id);
        if (!context) {
          console.error(`❌ [${WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND}] ${ERROR_MESSAGES[WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND]}: ${id}`);
          process.exit(1);
        }
      } else {
        context = await orchestrator.getContext();
        if (!context) {
          const active = await orchestrator.resumeActive();
          if (!active) {
            console.log('No active workflow. Run "codemap workflow start <task>" first.');
            return;
          }
          context = active;
        }
      }

      // 根据选项渲染不同视图
      if (options.timeline) {
        console.log(visualizer.renderTimeline(context));
      } else if (options.results) {
        const currentArtifacts = context.artifacts.get(context.currentPhase);
        if (currentArtifacts?.results) {
          console.log(visualizer.renderResultsTable(currentArtifacts.results));
        } else {
          console.log('No results available for current phase.');
        }
      } else {
        // 完整可视化
        console.log(visualizer.renderWorkflowStatus(context));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED}] ${ERROR_MESSAGES[WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED]}: ${errMsg}`);
      process.exit(1);
    }
  });

// ============================================
// 模板命令 (T010)
// ============================================

const template = workflow.command('template')
  .description('Workflow template management (T010)');

/**
 * 列出所有模板
 */
template.command('list')
  .description('List all available templates')
  .option('-a, --all', 'Include builtin templates')
  .action(async (options: { all?: boolean }) => {
    try {
      const manager = new WorkflowTemplateManager();
      await manager.loadCustomTemplates();

      const templates = options.all 
        ? manager.getAllTemplates()
        : manager.getAllBuiltinTemplates();

      if (templates.length === 0) {
        console.log('No templates found.');
        return;
      }

      console.log(`
╔══════════════════════════════════════════════════════════╗
║              [WORKFLOW TEMPLATES]                        ║
╚══════════════════════════════════════════════════════════╝
`);

      for (const t of templates) {
        const type = t.type === 'custom' ? '👤 custom' : '📦 builtin';
        console.log(`${type} │ ${t.name.padEnd(15)} │ ${t.description}`);
      }

      console.log(`
Use 'codemap workflow template info <name>' for details
Use 'codemap workflow template apply <name>' to apply a template
`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to list templates: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 显示模板详情
 */
template.command('info')
  .description('Show template details')
  .argument('<name>', 'Template name')
  .action(async (name: string) => {
    try {
      const manager = new WorkflowTemplateManager();
      await manager.loadCustomTemplates();

      const template = manager.getTemplate(name);
      if (!template) {
        console.error(`❌ [${WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND}] ${ERROR_MESSAGES[WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND]}: ${name}`);
        process.exit(1);
      }

      console.log(manager.renderTemplateInfo(template));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to get template info: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 应用模板
 */
template.command('apply')
  .description('Apply template to current workflow (set phase configuration)')
  .argument('<name>', 'Template name')
  .action(async (name: string) => {
    try {
      const manager = new WorkflowTemplateManager();
      await manager.loadCustomTemplates();

      const template = manager.getTemplate(name);
      if (!template) {
        console.error(`❌ [${WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND}] ${ERROR_MESSAGES[WorkflowErrorCode.E0016_TEMPLATE_NOT_FOUND]}: ${name}`);
        process.exit(1);
      }

      if (!manager.validateTemplate(template)) {
        console.error(`❌ [${WorkflowErrorCode.E0017_TEMPLATE_INVALID}] ${ERROR_MESSAGES[WorkflowErrorCode.E0017_TEMPLATE_INVALID]}: ${name}`);
        process.exit(1);
      }

      const orchestrator = new WorkflowOrchestrator();
      const context = await orchestrator.applyTemplate(name);

      console.log(`Applied template: ${template.name}`);
      console.log(`Type: ${template.type}`);
      console.log(`Phases: ${template.phases.map(p => p.name).join(' → ')}`);
      console.log(`Current phase: ${context.currentPhase}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg === 'No active workflow') {
        console.error(`❌ [${WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE}] ${ERROR_MESSAGES[WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE]}: No active workflow.`);
        process.exit(1);
      }
      console.error(`❌ Failed to apply template: ${errMsg}`);
      process.exit(1);
    }
  });

/**
 * 推荐模板
 */
template.command('recommend')
  .description('Recommend template based on task description')
  .argument('<task>', 'Task description')
  .action(async (task: string) => {
    try {
      const recommended = recommendTemplate(task);
      
      console.log(`
╔══════════════════════════════════════════════════════════╗
║              [TEMPLATE RECOMMENDATION]                   ║
╚══════════════════════════════════════════════════════════╝

Task: ${task}

Recommended: ${recommended.name}
Description: ${recommended.description}

Use:
  codemap workflow start "${task}" --template ${recommended.name}
`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to recommend template: ${errMsg}`);
      process.exit(1);
    }
  });

export const workflowCommand = workflow;
export default workflow;
