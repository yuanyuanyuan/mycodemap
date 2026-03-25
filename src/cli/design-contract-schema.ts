// [META] since:2026-03-25 | owner:cli-team | stable:false
// [WHY] Centralize design-contract path and section schema so CLI commands and tests share one truth

import type {
  DesignContractRequiredSectionId,
  DesignContractSectionId,
} from '../interface/types/design-contract.js';

export const DEFAULT_DESIGN_CONTRACT_PATH = 'mycodemap.design.md';

export const REQUIRED_DESIGN_CONTRACT_SECTIONS: readonly DesignContractRequiredSectionId[] = [
  'goal',
  'constraints',
  'acceptanceCriteria',
  'nonGoals',
];

export const OPTIONAL_DESIGN_CONTRACT_SECTIONS: readonly Exclude<
  DesignContractSectionId,
  DesignContractRequiredSectionId
>[] = [
  'context',
  'openQuestions',
  'notes',
];

export const DESIGN_CONTRACT_SECTION_IDS: readonly DesignContractSectionId[] = [
  ...REQUIRED_DESIGN_CONTRACT_SECTIONS,
  ...OPTIONAL_DESIGN_CONTRACT_SECTIONS,
];

export const DESIGN_CONTRACT_SECTION_LABELS: Readonly<Record<DesignContractSectionId, string>> = {
  goal: 'Goal',
  constraints: 'Constraints',
  acceptanceCriteria: 'Acceptance Criteria',
  nonGoals: 'Non-Goals',
  context: 'Context',
  openQuestions: 'Open Questions',
  notes: 'Notes',
};

export const DESIGN_CONTRACT_SECTION_ALIASES: Readonly<Record<DesignContractSectionId, readonly string[]>> = {
  goal: ['goal', 'goals', 'objective', 'objectives'],
  constraints: ['constraints', 'constraint', 'limits', 'limitations', 'guardrails'],
  acceptanceCriteria: [
    'acceptance criteria',
    'acceptance criterion',
    'success criteria',
    'acceptance',
  ],
  nonGoals: [
    'non-goals',
    'non goals',
    'non-goal',
    'non goal',
    'exclusions',
    'exclusion',
    'out of scope',
  ],
  context: ['context', 'background'],
  openQuestions: ['open questions', 'open question', 'questions'],
  notes: ['notes', 'note'],
};

const REQUIRED_DESIGN_CONTRACT_SECTION_SET = new Set<DesignContractSectionId>(
  REQUIRED_DESIGN_CONTRACT_SECTIONS,
);

function normalizeHeadingToken(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[:：]+$/u, '')
    .replace(/[-_]+/gu, ' ')
    .replace(/\s+/gu, ' ');
}

export function isRequiredDesignContractSection(
  sectionId: DesignContractSectionId,
): sectionId is DesignContractRequiredSectionId {
  return REQUIRED_DESIGN_CONTRACT_SECTION_SET.has(sectionId);
}

export function normalizeDesignContractHeading(
  heading: string,
): DesignContractSectionId | undefined {
  const normalizedHeading = normalizeHeadingToken(heading);

  for (const sectionId of DESIGN_CONTRACT_SECTION_IDS) {
    const aliases = DESIGN_CONTRACT_SECTION_ALIASES[sectionId];
    if (aliases.some((alias) => normalizeHeadingToken(alias) === normalizedHeading)) {
      return sectionId;
    }
  }

  return undefined;
}

export function getCanonicalDesignContractHeading(
  sectionId: DesignContractSectionId,
): string {
  return DESIGN_CONTRACT_SECTION_LABELS[sectionId];
}
