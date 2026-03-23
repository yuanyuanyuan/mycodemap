// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] 定义置信度计算规则，用于决定是否自动发布

import { CommitAnalysis } from './version-rules.js';
import { versionRules } from './version-rules.js';

export interface ConfidenceConfig {
  baseScore: number;
  range: { min: number; max: number };
  bonuses: { condition: string; points: number }[];
  penalties: { condition: string; points: number }[];
  thresholds: {
    autoRelease: number;
    confirmRequired: number;
    blockBelow: number;
  };
}

export const confidenceConfig: ConfidenceConfig = {
  baseScore: 50,
  range: { min: 0, max: 100 },

  // 加分项
  bonuses: [
    { condition: 'allCommitsConventional', points: 20 },
    { condition: 'coverageAbove80', points: 10 },
    { condition: 'noRiskyModules', points: 10 },
    { condition: 'changelogUpdated', points: 5 },
    { condition: 'singleFeature', points: 5 },
    { condition: 'cleanHistory', points: 5 }
  ],

  // 减分项
  penalties: [
    { condition: 'hasBreaking', points: -15 },
    { condition: 'manyFilesChanged', points: -10 },
    { condition: 'touchesRiskyModules', points: -10 },
    { condition: 'coverageBelow80', points: -5 },
    { condition: 'nonConventionalCommits', points: -5 }
  ],

  // 判定阈值
  thresholds: {
    autoRelease: 75,
    confirmRequired: 60,
    blockBelow: 60
  }
};

export interface ConfidenceInput {
  commits: CommitAnalysis[];
  changedFiles: string[];
  allCommitsConventional: boolean;
  coverageAbove80: boolean;
  changelogUpdated: boolean;
  hasBreaking: boolean;
}

export interface ConfidenceResult {
  score: number;
  breakdown: {
    base: number;
    bonuses: { condition: string; points: number }[];
    penalties: { condition: string; points: number }[];
  };
  decision: 'auto' | 'confirm' | 'block';
  reasons: string[];
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const { baseScore, bonuses, penalties, thresholds } = confidenceConfig;

  let score = baseScore;
  const appliedBonuses: { condition: string; points: number }[] = [];
  const appliedPenalties: { condition: string; points: number }[] = [];
  const reasons: string[] = [];

  // 计算加分项
  if (input.allCommitsConventional) {
    const bonus = bonuses.find(b => b.condition === 'allCommitsConventional')!;
    score += bonus.points;
    appliedBonuses.push(bonus);
    reasons.push(`所有 commit 遵循规范 (+${bonus.points})`);
  }

  if (input.coverageAbove80) {
    const bonus = bonuses.find(b => b.condition === 'coverageAbove80')!;
    score += bonus.points;
    appliedBonuses.push(bonus);
    reasons.push(`测试覆盖率 > 80% (+${bonus.points})`);
  }

  // 检查是否修改高风险模块
  const touchesRisky = input.changedFiles.some(f =>
    versionRules.riskyModules.some(pattern => f.startsWith(pattern.replace('/**', '')))
  );

  if (!touchesRisky) {
    const bonus = bonuses.find(b => b.condition === 'noRiskyModules')!;
    score += bonus.points;
    appliedBonuses.push(bonus);
    reasons.push(`未修改高风险模块 (+${bonus.points})`);
  } else {
    const penalty = penalties.find(p => p.condition === 'touchesRiskyModules')!;
    score += penalty.points;
    appliedPenalties.push(penalty);
    reasons.push(`修改了高风险模块 (${penalty.points})`);
  }

  if (input.changelogUpdated) {
    const bonus = bonuses.find(b => b.condition === 'changelogUpdated')!;
    score += bonus.points;
    appliedBonuses.push(bonus);
    reasons.push(`CHANGELOG 已更新 (+${bonus.points})`);
  }

  // 检查 commit 数量（单一功能）
  if (input.commits.length <= 5) {
    const bonus = bonuses.find(b => b.condition === 'singleFeature')!;
    score += bonus.points;
    appliedBonuses.push(bonus);
    reasons.push(`单一功能提交 (+${bonus.points})`);
  }

  // 检查文件变更数量
  if (input.changedFiles.length > 20) {
    const penalty = penalties.find(p => p.condition === 'manyFilesChanged')!;
    score += penalty.points;
    appliedPenalties.push(penalty);
    reasons.push(`修改文件较多 (${penalty.points})`);
  }

  // 检查破坏性变更
  if (input.hasBreaking) {
    const penalty = penalties.find(p => p.condition === 'hasBreaking')!;
    score += penalty.points;
    appliedPenalties.push(penalty);
    reasons.push(`检测到破坏性变更 (${penalty.points})`);
  }

  // 检查 conventional commits
  if (!input.allCommitsConventional) {
    const penalty = penalties.find(p => p.condition === 'nonConventionalCommits')!;
    score += penalty.points;
    appliedPenalties.push(penalty);
    reasons.push(`部分 commit 未遵循规范 (${penalty.points})`);
  }

  // 确保分数在有效范围内
  score = Math.max(confidenceConfig.range.min, Math.min(confidenceConfig.range.max, score));

  // 决定发布策略
  let decision: 'auto' | 'confirm' | 'block';
  if (score >= thresholds.autoRelease) {
    decision = 'auto';
  } else if (score >= thresholds.blockBelow) {
    decision = 'confirm';
  } else {
    decision = 'block';
  }

  return {
    score,
    breakdown: {
      base: baseScore,
      bonuses: appliedBonuses,
      penalties: appliedPenalties
    },
    decision,
    reasons
  };
}
