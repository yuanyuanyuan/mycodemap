// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Route analyze intents to primary/secondary tools with whitelist validation

/**
 * IntentRouter - 意图路由
 *
 * 负责将用户输入的参数映射为 CodemapIntent，
 * 验证意图是否在白名单中。
 */

import {
  PUBLIC_INTENTS,
  COMPATIBLE_LEGACY_INTENTS,
  type CodemapIntent,
  type AnalyzeArgs,
  type IntentType,
  type CompatibleLegacyIntentType,
  type ExecutionIntentType
} from './types.js';

/**
 * Public intent 的默认执行配置
 */
const PUBLIC_INTENT_CONFIG: Record<
  IntentType,
  { executionIntent: ExecutionIntentType; tool: string; secondary?: string }
> = {
  find: { executionIntent: 'search', tool: 'ast-grep' },
  read: { executionIntent: 'impact', tool: 'codemap', secondary: 'ast-grep' },
  link: { executionIntent: 'dependency', tool: 'codemap' },
  show: { executionIntent: 'overview', tool: 'codemap' }
};

/**
 * 旧 intent 的兼容归一化配置
 */
const LEGACY_INTENT_CONFIG: Record<
  CompatibleLegacyIntentType,
  { intent: IntentType; executionIntent: ExecutionIntentType; tool: string; secondary?: string }
> = {
  search: { intent: 'find', executionIntent: 'search', tool: 'ast-grep' },
  impact: { intent: 'read', executionIntent: 'impact', tool: 'codemap', secondary: 'ast-grep' },
  complexity: { intent: 'read', executionIntent: 'complexity', tool: 'codemap' },
  dependency: { intent: 'link', executionIntent: 'dependency', tool: 'codemap' },
  reference: { intent: 'link', executionIntent: 'reference', tool: 'ast-grep' },
  overview: { intent: 'show', executionIntent: 'overview', tool: 'codemap' },
  documentation: { intent: 'show', executionIntent: 'documentation', tool: 'codemap' }
};

/**
 * IntentRouter 类 - 意图路由器
 */
export class IntentRouter {
  /**
   * 将分析参数路由为 CodemapIntent
   *
   * @param args 分析命令参数
   * @returns CodemapIntent 对象
   */
  route(args: AnalyzeArgs): CodemapIntent {
    const resolution = this.parseIntent(args.intent);

    // 确定目标
    const targets = args.targets ?? [];

    // 确定关键词
    const keywords = args.keywords ?? [];

    // 确定范围
    const scope = args.scope ?? 'direct';

    return {
      intent: resolution.intent,
      executionIntent: resolution.executionIntent,
      targets,
      keywords,
      scope,
      tool: resolution.tool,
      secondary: resolution.secondary,
      compatibility: resolution.compatibility
    };
  }

  /**
   * 解析并归一化输入 intent
   */
  private parseIntent(intent?: string): Pick<CodemapIntent, 'intent' | 'executionIntent' | 'tool' | 'secondary' | 'compatibility'> {
    if (!intent) {
      throw new Error('缺少必要参数: intent');
    }

    if (PUBLIC_INTENTS.includes(intent as IntentType)) {
      const publicIntent = intent as IntentType;
      const config = PUBLIC_INTENT_CONFIG[publicIntent];
      return {
        intent: publicIntent,
        executionIntent: config.executionIntent,
        tool: config.tool,
        secondary: config.secondary
      };
    }

    if (COMPATIBLE_LEGACY_INTENTS.includes(intent as CompatibleLegacyIntentType)) {
      const legacyIntent = intent as CompatibleLegacyIntentType;
      const config = LEGACY_INTENT_CONFIG[legacyIntent];
      return {
        intent: config.intent,
        executionIntent: config.executionIntent,
        tool: config.tool,
        secondary: config.secondary,
        compatibility: {
          isDeprecated: true,
          normalizedFrom: legacyIntent
        }
      };
    }

    throw new Error(
      `无效的 intent: ${intent}. 有效的意图类型: ${PUBLIC_INTENTS.join(', ')}`
    );
  }

  /**
   * 检查 intent 是否有效
   */
  isValidIntent(intent: string): boolean {
    return PUBLIC_INTENTS.includes(intent as IntentType)
      || COMPATIBLE_LEGACY_INTENTS.includes(intent as CompatibleLegacyIntentType);
  }

  /**
   * 获取所有有效的意图类型
   */
  getValidIntents(): IntentType[] {
    return [...PUBLIC_INTENTS];
  }
}
