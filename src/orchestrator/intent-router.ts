// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Route analyze intents to primary/secondary tools with whitelist validation

/**
 * IntentRouter - 意图路由
 *
 * 负责将用户输入的参数映射为 CodemapIntent，
 * 验证意图是否在白名单中。
 */

import type { CodemapIntent, AnalyzeArgs, IntentType } from './types.js';

/**
 * 有效的意图类型白名单
 */
const VALID_INTENTS: IntentType[] = [
  'impact',
  'dependency',
  'search',
  'documentation',
  'complexity',
  'overview',
  'refactor',
  'reference'
];

/**
 * 意图到默认工具的映射
 */
const INTENT_DEFAULT_TOOL: Record<IntentType, string> = {
  impact: 'codemap',
  dependency: 'codemap',
  search: 'ast-grep',
  documentation: 'codemap',
  complexity: 'codemap',
  overview: 'codemap',
  refactor: 'ast-grep',
  reference: 'ast-grep'
};

/**
 * IntentRouter 类 - 意图路由器
 */
export class IntentRouter {
  /** 有效意图白名单 */
  private validIntents: IntentType[] = VALID_INTENTS;

  /**
   * 将分析参数路由为 CodemapIntent
   *
   * @param args 分析命令参数
   * @returns CodemapIntent 对象
   */
  route(args: AnalyzeArgs): CodemapIntent {
    // 解析 intent
    const intent = this.parseIntent(args.intent);

    // 验证 intent 是否有效
    this.validateIntent(intent);

    // 确定目标
    const targets = args.targets ?? [];

    // 确定关键词
    const keywords = args.keywords ?? [];

    // 确定范围
    const scope = args.scope ?? 'direct';

    // 确定工具
    const tool = args.intent ? INTENT_DEFAULT_TOOL[intent] : 'codemap';
    const secondary = intent === 'impact' ? 'ast-grep' : undefined;

    return {
      intent,
      targets,
      keywords,
      scope,
      tool,
      secondary
    };
  }

  /**
   * 解析 intent 字符串为 IntentType
   */
  private parseIntent(intent?: string): IntentType {
    if (!intent) {
      // 默认意图
      return 'search';
    }

    return intent as IntentType;
  }

  /**
   * 验证 intent 是否在白名单中
   *
   * @param intent 意图类型
   * @throws 如果 intent 无效，抛出错误
   */
  private validateIntent(intent: IntentType): void {
    if (!this.validIntents.includes(intent)) {
      throw new Error(
        `无效的 intent: ${intent}. 有效的意图类型: ${this.validIntents.join(', ')}`
      );
    }
  }

  /**
   * 检查 intent 是否有效
   */
  isValidIntent(intent: string): boolean {
    return this.validIntents.includes(intent as IntentType);
  }

  /**
   * 获取所有有效的意图类型
   */
  getValidIntents(): IntentType[] {
    return [...this.validIntents];
  }
}
