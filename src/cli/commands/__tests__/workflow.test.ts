/**
 * [META] Workflow CLI Command Test
 * [WHY] Ensure workflow management commands (start, status, proceed, resume, checkpoint, list, delete) work correctly with error codes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { workflowCommand, WorkflowErrorCode, ERROR_MESSAGES } from '../workflow.js';

// Mock dependencies
vi.mock('../../../orchestrator/workflow/workflow-orchestrator.js', () => ({
  WorkflowOrchestrator: vi.fn(() => ({
    start: vi.fn(),
    getStatus: vi.fn(),
    proceedToNextPhase: vi.fn(),
    resume: vi.fn(),
    checkpoint: vi.fn(),
    listWorkflows: vi.fn(),
    deleteWorkflow: vi.fn(),
  })),
}));

vi.mock('commander', () => ({
  Command: vi.fn().mockImplementation(() => {
    type MockAction = (...args: unknown[]) => unknown;
    type MockCommand = {
      _actionFn?: MockAction;
      _hasOptions: boolean;
      _subcommands: Map<string, MockCommand>;
      name: ReturnType<typeof vi.fn>;
      description: ReturnType<typeof vi.fn>;
      command: ReturnType<typeof vi.fn>;
      argument: ReturnType<typeof vi.fn>;
      option: ReturnType<typeof vi.fn>;
      action: ReturnType<typeof vi.fn>;
      parseAsync: ReturnType<typeof vi.fn>;
      commands: MockCommand[];
    };

    const createMockCommand = (): MockCommand => {
      const command = {} as MockCommand;
      command._hasOptions = false;
      command._subcommands = new Map();
      command.commands = [];

      command.name = vi.fn().mockReturnValue(command);
      command.description = vi.fn().mockReturnValue(command);
      command.argument = vi.fn().mockReturnValue(command);
      command.option = vi.fn().mockImplementation(() => {
        command._hasOptions = true;
        return command;
      });
      command.action = vi.fn().mockImplementation((fn: MockAction) => {
        command._actionFn = fn;
        return command;
      });
      command.command = vi.fn().mockImplementation((name: string) => {
        const subcommand = createMockCommand();
        const commandName = name.split(' ')[0];
        command._subcommands.set(commandName, subcommand);
        command.commands.push(subcommand);
        return subcommand;
      });
      command.parseAsync = vi.fn().mockImplementation(async (argv: string[]) => {
        const [subcommandName, ...rawArgs] = argv.slice(2);
        const target = subcommandName ? command._subcommands.get(subcommandName) : command;
        if (!target?._actionFn) return;

        const options: Record<string, string | boolean> = {};
        const positionalArgs: string[] = [];

        for (let i = 0; i < rawArgs.length; i++) {
          const token = rawArgs[i];
          if (token.startsWith('-')) {
            const next = rawArgs[i + 1];
            const key = token.replace(/^-+/, '');
            if (next && !next.startsWith('-')) {
              options[key] = next;
              i++;
            } else {
              options[key] = true;
            }

            // Map -f to force for proceed command tests.
            if (key === 'f') {
              options.force = true;
            }
          } else {
            positionalArgs.push(token);
          }
        }

        if (target._hasOptions) {
          if (positionalArgs.length > 0) {
            await target._actionFn(...positionalArgs, options);
          } else {
            await target._actionFn(options);
          }
          return;
        }

        await target._actionFn(...positionalArgs);
      });

      return command;
    };

    return createMockCommand();
  }),
}));

import { WorkflowOrchestrator } from '../../../orchestrator/workflow/workflow-orchestrator.js';

describe('Workflow CLI', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let mockExitCode: number | undefined;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExitCode = undefined;
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      mockExitCode = typeof code === 'number' ? code : 1;
      throw new Error(`Process exit with code: ${code}`);
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Module Exports', () => {
    it('should export WorkflowErrorCode enum with correct values', () => {
      expect(WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND).toBe('E0011');
      expect(WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE).toBe('E0012');
      expect(WorkflowErrorCode.E0013_CHECKPOINT_VALIDATION_FAILED).toBe('E0013');
      expect(WorkflowErrorCode.E0014_WORKFLOW_CREATION_FAILED).toBe('E0014');
      expect(WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED).toBe('E0015');
    });

    it('should export ERROR_MESSAGES with correct error messages', () => {
      expect(ERROR_MESSAGES[WorkflowErrorCode.E0011_WORKFLOW_NOT_FOUND]).toBe('工作流ID不存在');
      expect(ERROR_MESSAGES[WorkflowErrorCode.E0012_INVALID_WORKFLOW_STATE]).toBe('工作流状态无效（无法执行当前操作）');
      expect(ERROR_MESSAGES[WorkflowErrorCode.E0013_CHECKPOINT_VALIDATION_FAILED]).toBe('阶段检查点验证失败');
      expect(ERROR_MESSAGES[WorkflowErrorCode.E0014_WORKFLOW_CREATION_FAILED]).toBe('工作流创建失败');
      expect(ERROR_MESSAGES[WorkflowErrorCode.E0015_WORKFLOW_PERSISTENCE_FAILED]).toBe('工作流持久化失败');
    });
  });

  describe('start command', () => {
    it('should start a new workflow successfully', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      const mockStart = vi.fn().mockResolvedValue({
        id: 'wf-123',
        currentPhase: 'discovery',
      });
      mockOrchestrator.mockImplementation(() => ({
        start: mockStart,
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'start', 'Test task']);

      expect(mockStart).toHaveBeenCalledWith('Test task');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('wf-123'));
    });

    it('should handle workflow creation failure', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        start: vi.fn().mockRejectedValue(new Error('Creation failed')),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'start', 'Test task']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0014'));
    });
  });

  describe('status command', () => {
    it('should show active workflow status', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: true,
          task: 'Test task',
          currentPhase: 'discovery',
          phaseStatus: 'in_progress',
          progress: 50,
          artifacts: ['artifact1'],
        }),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test task'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('discovery'));
    });

    it('should show message when no active workflow', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: false,
        }),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'status']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active workflow'));
    });

    it('should handle status check failure', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockRejectedValue(new Error('Status check failed')),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'status']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0015'));
    });
  });

  describe('proceed command', () => {
    it('should proceed to next phase successfully', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: true,
          currentPhase: 'discovery',
          phaseStatus: 'completed',
        }),
        proceedToNextPhase: vi.fn().mockResolvedValue('refactoring'),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'proceed']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('refactoring'));
    });

    it('should exit when no active workflow', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: false,
        }),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'proceed']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active workflow'));
    });

    it('should exit when phase is not completed without force', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: true,
          currentPhase: 'discovery',
          phaseStatus: 'in_progress',
        }),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'proceed']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0012'));
    });

    it('should proceed with force option when phase not completed', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: true,
          currentPhase: 'discovery',
          phaseStatus: 'in_progress',
        }),
        proceedToNextPhase: vi.fn().mockResolvedValue('refactoring'),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'proceed', '--force']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('refactoring'));
    });

    it('should handle proceed failure', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: true,
          currentPhase: 'discovery',
          phaseStatus: 'completed',
        }),
        proceedToNextPhase: vi.fn().mockRejectedValue(new Error('Proceed failed')),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'proceed']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0012'));
    });
  });

  describe('resume command', () => {
    it('should resume workflow with specific ID', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        resume: vi.fn().mockResolvedValue({
          id: 'wf-123',
          currentPhase: 'refactoring',
        }),
        getStatus: vi.fn().mockResolvedValue({
          currentPhase: 'refactoring',
          phaseStatus: 'in_progress',
          progress: 30,
        }),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'resume', 'wf-123']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('wf-123'));
    });

    it('should resume active workflow without ID', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        resume: vi.fn().mockResolvedValue({
          id: 'wf-456',
          currentPhase: 'discovery',
        }),
        getStatus: vi.fn().mockResolvedValue({
          currentPhase: 'discovery',
          phaseStatus: 'in_progress',
          progress: 20,
        }),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'resume']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('wf-456'));
    });

    it('should exit when workflow ID not found', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        resume: vi.fn().mockResolvedValue(null),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'resume', 'nonexistent']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0011'));
    });

    it('should show message when no active workflow to resume', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        resume: vi.fn().mockResolvedValue(null),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'resume']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active workflow'));
    });
  });

  describe('checkpoint command', () => {
    it('should create checkpoint successfully', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: true,
        }),
        checkpoint: vi.fn().mockResolvedValue(undefined),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'checkpoint']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Checkpoint created'));
    });

    it('should show message when no active workflow', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: false,
        }),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'checkpoint']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active workflow'));
    });

    it('should handle checkpoint creation failure', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        getStatus: vi.fn().mockResolvedValue({
          active: true,
        }),
        checkpoint: vi.fn().mockRejectedValue(new Error('Checkpoint failed')),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'checkpoint']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0013'));
    });
  });

  describe('list command', () => {
    it('should list all workflows', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        listWorkflows: vi.fn().mockResolvedValue([
          { id: 'wf-1', task: 'Task 1', currentPhase: 'discovery', phaseStatus: 'completed', updatedAt: new Date().toISOString() },
          { id: 'wf-2', task: 'Task 2', currentPhase: 'refactoring', phaseStatus: 'in_progress', updatedAt: new Date().toISOString() },
        ]),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'list']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('wf-1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('wf-2'));
    });

    it('should show message when no workflows exist', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        listWorkflows: vi.fn().mockResolvedValue([]),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'list']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No workflows found'));
    });

    it('should handle list failure', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        listWorkflows: vi.fn().mockRejectedValue(new Error('List failed')),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'list']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0015'));
    });
  });

  describe('delete command', () => {
    it('should delete workflow successfully', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        listWorkflows: vi.fn().mockResolvedValue([{ id: 'wf-123' }]),
        deleteWorkflow: vi.fn().mockResolvedValue(undefined),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await workflowCommand.parseAsync(['node', 'workflow', 'delete', 'wf-123']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('deleted'));
    });

    it('should exit when workflow ID not found', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        listWorkflows: vi.fn().mockResolvedValue([{ id: 'wf-456' }]),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'delete', 'nonexistent']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0011'));
    });

    it('should handle delete failure', async () => {
      const mockOrchestrator = vi.mocked(WorkflowOrchestrator);
      mockOrchestrator.mockImplementation(() => ({
        listWorkflows: vi.fn().mockResolvedValue([{ id: 'wf-123' }]),
        deleteWorkflow: vi.fn().mockRejectedValue(new Error('Delete failed')),
      } as unknown as InstanceType<typeof WorkflowOrchestrator>));

      await expect(workflowCommand.parseAsync(['node', 'workflow', 'delete', 'wf-123']))
        .rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('E0015'));
    });
  });
});
