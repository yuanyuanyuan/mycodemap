# Workflow Module Test Suite Scoring Guide

## Total Score: 100 Points

---

## Scoring Breakdown

### Phase 1: Configuration & Types Testing (20 points)

| Checkpoint | Points | Description |
|------------|--------|-------------|
| 1.1 | 5 | All configuration constants are tested |
| 1.2 | 5 | Type exports are verified |
| 1.3 | 5 | Configuration values match expected defaults |
| 1.4 | 5 | Type unions have correct members |

**Pass Criteria**: All 4 checkpoints passed

---

### Phase 2: Workflow Context Testing (25 points)

| Checkpoint | Points | Description |
|------------|--------|-------------|
| 2.1 | 5 | WorkflowContextFactory.create() generates valid context |
| 2.2 | 5 | WorkflowContextFactory.validate() detects missing fields |
| 2.3 | 5 | WorkflowContextFactory.createPhaseArtifacts() creates proper structure |
| 2.4 | 5 | WorkflowContextValidator.canProceed() checks completion |
| 2.5 | 5 | All state machine transitions are tested |

**Pass Criteria**: All 5 checkpoints passed

---

### Phase 3: Phase Checkpoint Testing (20 points)

| Checkpoint | Points | Description |
|------------|--------|-------------|
| 3.1 | 5 | PhaseCheckpoint.validate() passes when deliverables exist |
| 3.2 | 5 | PhaseCheckpoint.validate() fails when deliverables missing |
| 3.3 | 5 | PhaseCheckpoint.validate() fails when validator returns false |
| 3.4 | 5 | PhaseCheckpoint.getSummary() returns correct statistics |

**Pass Criteria**: All 4 checkpoints passed

---

### Phase 4: Workflow Persistence Testing (20 points)

| Checkpoint | Points | Description |
|------------|--------|-------------|
| 4.1 | 4 | save() serializes Map artifacts correctly |
| 4.2 | 4 | save() serializes Set userConfirmed correctly |
| 4.3 | 4 | save() serializes Date objects to ISO strings |
| 4.4 | 4 | load() deserializes all complex types correctly |
| 4.5 | 2 | loadActive() and list() work correctly |
| 4.6 | 2 | delete() removes files and clears active marker |

**Pass Criteria**: 5/6 checkpoints passed

---

### Phase 5: Workflow Orchestrator Testing (15 points)

| Checkpoint | Points | Description |
|------------|--------|-------------|
| 5.1 | 3 | start() creates and saves workflow |
| 5.2 | 3 | executeCurrentPhase() updates status and returns result |
| 5.3 | 3 | proceedToNextPhase() advances with validation |
| 5.4 | 3 | getGuidance() returns correct action for confidence levels |
| 5.5 | 3 | All 6 phase definitions are correctly configured |

**Pass Criteria**: 4/5 checkpoints passed

---

## Grading Scale

| Score Range | Grade | Status |
|-------------|-------|--------|
| 95-100 | A+ | Excellent - All requirements exceeded |
| 90-94 | A | Excellent - All requirements met |
| 85-89 | A- | Very Good - Minor gaps |
| 80-84 | B+ | Good - Acceptable with room for improvement |
| 75-79 | B | Satisfactory - Meets minimum requirements |
| 70-74 | B- | Below Average - Needs work |
| 60-69 | C | Poor - Significant gaps |
| Below 60 | F | Fail - Does not meet requirements |

---

## Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Line Coverage | 90% | 100% |
| Branch Coverage | 85% | 100% |
| Function Coverage | 95% | 100% |

**Scoring Adjustment**:
- Line coverage < 90%: -10 points
- Branch coverage < 85%: -10 points
- Function coverage < 95%: -5 points

---

## Quality Criteria

| Criterion | Weight | Evaluation Method |
|-----------|--------|-------------------|
| Test Organization | 10% | Clear describe/it structure |
| Mock Usage | 10% | Proper use of vi.mock/vi.fn |
| Edge Case Coverage | 15% | Empty inputs, null values, errors |
| Async Handling | 10% | Proper await/async patterns |
| Readability | 10% | Descriptive test names |
| Maintainability | 10% | Shared fixtures, DRY principles |

---

## Final Score Calculation

```
Base Score = Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5
Coverage Adjustment = (Line Penalty + Branch Penalty + Function Penalty)
Quality Bonus = Up to +5 points for exceptional quality

Final Score = Base Score - Coverage Adjustment + Quality Bonus
```

---

## Acceptance Thresholds

- **Pass**: Final Score ≥ 75 AND all Phase minimum criteria met
- **Conditional Pass**: Final Score ≥ 70 with minor fixes required
- **Fail**: Final Score < 70 OR any Phase has 0 checkpoints passed

---

## Notes for Evaluators

1. **Prefer retrieval-led reasoning over pre-training-led reasoning** - Compare actual test code against source code requirements
2. Check that mocks are properly reset between tests (`beforeEach`)
3. Verify that tests don't depend on execution order
4. Ensure error cases are explicitly tested, not just happy paths
5. Confirm that TypeScript types are properly used in tests

---

## Prefer retrieval-led reasoning over pre-training-led reasoning

Always refer to the actual source code when evaluating test implementations.
