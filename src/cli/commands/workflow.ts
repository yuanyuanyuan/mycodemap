// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Workflow CLI commands for managing refactoring workflows with error code support

/**
 * Workflow CLI 命令
 * 工作流管理命令：start, status, proceed, resume, checkpoint
 */

import { Command } from 'commander';
import { WorkflowOrchestrator } from '../../orchestrator/workflow/workflow-orchestrator.js';
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
  .action(async (task: string) => {
    try {
      const orchestrator = new WorkflowOrchestrator();
      const context = await orchestrator.start(task);

      console.log(`
╔══════════════════════════════════════════════════════════╗
║              [WORKFLOW STARTED]                          ║
╚══════════════════════════════════════════════════════════╝

Task: ${task}
ID: ${context.id}
Phase: ${context.currentPhase}

Next steps:
  1. codemap workflow status    # 查看当前状态
  2. codemap analyze --intent reference --keywords ...
  3. codemap workflow proceed   # 进入下一阶段
`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
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

      console.log(`
╔══════════════════════════════════════════════════════════╗
║              [WORKFLOW STATUS]                          ║
╚══════════════════════════════════════════════════════════╝

Task: ${status.task}
Phase: ${status.currentPhase}
Status: ${status.phaseStatus}
Progress: ${status.progress?.toFixed(0) || 0}%

Completed phases: ${status.artifacts?.join(', ') || 'none'}
`);
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
        const context = await orchestrator.resume('');
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

export const workflowCommand = workflow;
export default workflow;
