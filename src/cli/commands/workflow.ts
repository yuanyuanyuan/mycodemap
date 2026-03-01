/**
 * Workflow CLI 命令
 * 工作流管理命令：start, status, proceed, resume, checkpoint
 */

import { Command } from 'commander';
import { WorkflowOrchestrator } from '../../orchestrator/workflow/workflow-orchestrator.js';
import type { AnalyzeArgs } from '../../orchestrator/types.js';

const workflow = new Command('workflow');
workflow.description('Workflow management - manage development workflow across multiple phases');

/**
 * 启动新工作流
 */
workflow.command('start')
  .description('Start a new development workflow')
  .argument('<task>', 'Task description')
  .action(async (task: string) => {
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
  });

/**
 * 查看工作流状态
 */
workflow.command('status')
  .description('Show current workflow status')
  .action(async () => {
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
  });

/**
 * 推进到下一阶段
 */
workflow.command('proceed')
  .description('Proceed to next phase')
  .option('-f, --force', 'Skip verification')
  .action(async (options) => {
    const orchestrator = new WorkflowOrchestrator();
    const status = await orchestrator.getStatus();

    if (!status.active) {
      console.log('No active workflow. Run "codemap workflow start <task>" first.');
      return;
    }

    if (status.phaseStatus !== 'completed' && status.phaseStatus !== 'verified' && !options.force) {
      console.log(`Current phase ${status.currentPhase} is not completed (status: ${status.phaseStatus}). Use --force to override.`);
      return;
    }

    try {
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
      console.error(`Error: ${(error as Error).message}`);
    }
  });

/**
 * 恢复工作流
 */
workflow.command('resume')
  .description('Resume an interrupted workflow')
  .argument('[id]', 'Workflow ID (optional, defaults to active)')
  .action(async (id?: string) => {
    const orchestrator = new WorkflowOrchestrator();

    if (id) {
      const context = await orchestrator.resume(id);
      if (!context) {
        console.log(`Workflow not found: ${id}`);
        return;
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
  });

/**
 * 创建检查点
 */
workflow.command('checkpoint')
  .description('Create a checkpoint of current workflow state')
  .action(async () => {
    const orchestrator = new WorkflowOrchestrator();

    // 先加载活动工作流
    const status = await orchestrator.getStatus();
    if (!status.active) {
      console.log('No active workflow. Run "codemap workflow start <task>" first.');
      return;
    }

    try {
      await orchestrator.checkpoint();
      console.log('Checkpoint created successfully.');
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
    }
  });

/**
 * 列出所有工作流
 */
workflow.command('list')
  .description('List all workflows')
  .action(async () => {
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
  });

/**
 * 删除工作流
 */
workflow.command('delete')
  .description('Delete a workflow')
  .argument('<id>', 'Workflow ID')
  .action(async (id: string) => {
    const orchestrator = new WorkflowOrchestrator();
    await orchestrator.deleteWorkflow(id);
    console.log(`Workflow ${id} deleted.`);
  });

export const workflowCommand = workflow;
export default workflow;
