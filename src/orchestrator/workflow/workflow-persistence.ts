// [META] since:2026-03-02 | owner:workflow-team | stable:true
// [WHY] Persist workflow context safely with Map/Set/Date serialization and active-workflow recovery

/**
 * 工作流持久化
 * 处理工作流上下文的序列化和反序列化
 */

import { promises as fs, existsSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import type { WorkflowContext, WorkflowPhase, PhaseArtifacts, WorkflowSummary, CachedResults } from './types.js';

/**
 * 路径兼容常量
 */
const DEFAULT_OUTPUT_DIR_NEW = '.mycodemap';
const DEFAULT_OUTPUT_DIR_OLD = '.codemap';

interface SerializedContext {
  id: string;
  task: string;
  templateName?: string;
  currentPhase: WorkflowPhase;
  phaseStatus: string;
  artifacts: [WorkflowPhase, PhaseArtifacts][];
  cachedResults: CachedResults;
  userConfirmed: WorkflowPhase[];
  startedAt: string;
  updatedAt: string;
}

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
 * 工作流持久化类
 */
export class WorkflowPersistence {
  private storagePath: string;
  private activePath: string;

  constructor() {
    const workflowDir = resolveWorkflowDir();
    this.storagePath = workflowDir;
    this.activePath = join(workflowDir, 'active.json');
  }

  /**
   * 保存工作流上下文
   */
  async save(context: WorkflowContext): Promise<void> {
    // 确保目录存在
    await fs.mkdir(this.storagePath, { recursive: true });

    const filePath = join(this.storagePath, `${context.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(this.serialize(context), null, 2));
    await fs.writeFile(this.activePath, JSON.stringify({ id: context.id }, null, 2));
  }

  /**
   * 加载指定工作流
   */
  async load(id: string): Promise<WorkflowContext | null> {
    const filePath = join(this.storagePath, `${id}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.deserialize(JSON.parse(content));
    } catch {
      return null;
    }
  }

  /**
   * 加载活动工作流
   */
  async loadActive(): Promise<WorkflowContext | null> {
    try {
      const content = await fs.readFile(this.activePath, 'utf-8');
      const { id } = JSON.parse(content);
      return id ? this.load(id) : null;
    } catch {
      return null;
    }
  }

  /**
   * 列出所有工作流摘要
   */
  async list(): Promise<WorkflowSummary[]> {
    try {
      const dir = join(process.cwd(), this.storagePath);
      const files = await fs.readdir(dir);
      const summaries: WorkflowSummary[] = [];

      for (const file of files) {
        if (!file.endsWith('.json') || file === 'active.json') continue;

        try {
          const content = await fs.readFile(join(dir, file), 'utf-8');
          const ctx = JSON.parse(content) as SerializedContext;

          summaries.push({
            id: ctx.id,
            task: ctx.task,
            currentPhase: ctx.currentPhase,
            phaseStatus: ctx.phaseStatus as WorkflowContext['phaseStatus'],
            updatedAt: ctx.updatedAt
          });
        } catch {
          // 跳过无法解析的文件
        }
      }

      return summaries;
    } catch {
      return [];
    }
  }

  /**
   * 删除工作流
   */
  async delete(id: string): Promise<void> {
    const filePath = join(this.storagePath, `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在，忽略
    }

    // 如果删除的是活动工作流，清除活动标记
    try {
      const activeContent = await fs.readFile(this.activePath, 'utf-8');
      const { id: activeId } = JSON.parse(activeContent);
      if (activeId === id) {
        await fs.writeFile(this.activePath, JSON.stringify({ id: null }, null, 2));
      }
    } catch {
      // 忽略
    }
  }

  /**
   * 序列化上下文（处理 Map 和 Set）
   */
  private serialize(context: WorkflowContext): SerializedContext {
    return {
      ...context,
      artifacts: Array.from(context.artifacts.entries()),
      userConfirmed: Array.from(context.userConfirmed.values()),
      startedAt: context.startedAt.toISOString(),
      updatedAt: context.updatedAt.toISOString()
    };
  }

  /**
   * 反序列化上下文（还原 Map 和 Set）
   */
  private deserialize(raw: SerializedContext): WorkflowContext {
    // 处理 artifacts 中的日期
    const processedArtifacts = new Map<WorkflowPhase, PhaseArtifacts>();
    for (const [phase, artifact] of (raw.artifacts || [])) {
      processedArtifacts.set(phase, {
        ...artifact,
        createdAt: new Date(artifact.createdAt)
      } as PhaseArtifacts);
    }

    return {
      id: raw.id,
      task: raw.task,
      templateName: raw.templateName,
      currentPhase: raw.currentPhase,
      phaseStatus: raw.phaseStatus as WorkflowContext['phaseStatus'],
      artifacts: processedArtifacts,
      cachedResults: raw.cachedResults,
      userConfirmed: new Set(raw.userConfirmed || []),
      startedAt: new Date(raw.startedAt),
      updatedAt: new Date(raw.updatedAt)
    };
  }
}
