# Triad Workflow for Workflow Test Generation Task

## Task ID
`group-d-workflow-001`

## Overview

This document defines the Triad workflow for generating comprehensive test suites for the workflow orchestrator module. The Triad consists of three independent agents: **Generator**, **QA**, and **Supervisor**.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Generator  │────▶│     QA      │────▶│  Supervisor │
│   (gen)     │     │   (qa)      │     │(supervisor) │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                       │
       └───────────────────────────────────────┘
              (Feedback loop if rejected)
```

---

## Phase 1: Generation

### Agent: Generator

**Objective**: Create complete task suite for workflow module test generation.

**Inputs**:
- 6 source files in `/data/codemap/src/orchestrator/workflow/`
- 2 design documents
- Test framework requirements (Vitest)

**Process**:

1. **Source Code Analysis** (20 minutes)
   - Read all 6 source files
   - Identify public APIs and key functions
   - Map dependencies and integration points
   - Note complex logic requiring special attention

2. **Test Strategy Design** (30 minutes)
   - Define test file structure (6 test files)
   - Plan mock strategy for each module
   - Identify state machine transitions to test
   - Plan serialization/deserialization tests

3. **Task Suite Generation** (40 minutes)
   - Write PROMPT.md with detailed requirements
   - Create EVAL.ts with test code skeletons
   - Define SCORING.md with 100-point rubric
   - Configure task-metadata.yaml
   - Create TRIAD_ROLES.yaml
   - Write TRIAD_WORKFLOW.md (this file)
   - Create TRIAD_ACCEPTANCE.md

**Outputs**:
- 7 deliverable files in `/data/codemap/.kimi/tasks/group-d-workflow/`

**Completion Criteria**:
- All files created with required content
- PROMPT.md includes retrieval-led reasoning instruction
- EVAL.ts includes Phase 4 test code
- SCORING.md totals exactly 100 points
- 3 independent agents defined

---

## Phase 2: QA Review

### Agent: QA Reviewer

**Objective**: Verify task completeness, correctness, and coverage.

**Inputs**:
- All 7 deliverables from Generator
- Source code files
- Design documents

**Review Process**:

#### 2.1 Coverage Analysis (20 minutes)

Check that all public methods are covered:

| Module | Methods | Test Coverage |
|--------|---------|---------------|
| config.ts | 0 (constants) | ✅ N/A |
| types.ts | 0 (types only) | ✅ N/A |
| workflow-context.ts | 5 | ☐ Verify |
| phase-checkpoint.ts | 3 | ☐ Verify |
| workflow-persistence.ts | 5 | ☐ Verify |
| workflow-orchestrator.ts | 9+ | ☐ Verify |

#### 2.2 Edge Case Identification (20 minutes)

Verify these edge cases are addressed:

- [ ] Empty task description
- [ ] Invalid state transitions
- [ ] Missing artifacts when proceeding
- [ ] File not found in checkpoint validation
- [ ] Corrupted persistence data
- [ ] Force proceed flag behavior
- [ ] Confidence level boundary values (0.3, 0.4, 0.7)

#### 2.3 Mock Appropriateness (15 minutes)

Verify mocking strategy:

- [ ] `node:fs` module is properly mocked
- [ ] External dependencies are mocked
- [ ] Mock reset between tests is configured
- [ ] No real file system operations

#### 2.4 Scoring Validation (10 minutes)

Verify scoring rubric:

- [ ] Total equals 100 points
- [ ] Distribution is fair
- [ ] Criteria are objective
- [ ] Coverage penalties are reasonable

**Output**: QA Review Report

```markdown
## QA Review Report

### Summary
- Status: [APPROVED / CHANGES_REQUESTED / REJECTED]
- Critical Issues: [count]
- Major Issues: [count]
- Minor Issues: [count]

### Findings
[List specific findings with recommendations]

### Recommendations
[List suggested improvements]
```

**Decision**:
- **APPROVED**: Proceed to Supervisor review
- **CHANGES_REQUESTED**: Return to Generator with feedback
- **REJECTED**: Significant rework needed

---

## Phase 3: Supervision

### Agent: Supervisor

**Objective**: Final quality gate and go/no-go decision.

**Inputs**:
- Generator outputs
- QA review report
- Source verification

**Quality Gate Checklist**:

#### Must-Have (All Required)
- [ ] All 7 deliverables present
- [ ] PROMPT.md has retrieval-led instruction
- [ ] EVAL.ts has Phase 4 test code
- [ ] SCORING.md totals 100 points
- [ ] 3 independent agents defined in TRIAD_ROLES.yaml
- [ ] Task ID specified in all relevant files

#### Should-Have (Majority Required)
- [ ] Coverage targets defined
- [ ] Mock strategy documented
- [ ] Edge cases identified
- [ ] Anti-patterns documented

#### Nice-to-Have (Bonus)
- [ ] Example test code provided
- [ ] Troubleshooting guide
- [ ] Common pitfalls documented

**Decision Matrix**:

| Must-Have | Should-Have | Decision |
|-----------|-------------|----------|
| All pass | Majority pass | ✅ APPROVE |
| All pass | Minority pass | ⚠️ CONDITIONAL |
| Any fail | Any | ❌ REJECT |

**Output**: Quality Gate Report

```markdown
## Quality Gate Report

### Decision: [APPROVED / CONDITIONAL / REJECTED]

### Checklist Results
- Must-Have: [X/Y]
- Should-Have: [X/Y]
- Nice-to-Have: [X/Y]

### QA Review Integration
- QA Status: [APPROVED / CHANGES_REQUESTED]
- Critical Concerns: [list if any]

### Next Steps
[Instructions for next phase]
```

---

## Feedback Loops

### Loop 1: QA → Generator

Triggered when QA identifies issues:

```
QA identifies issues
       │
       ▼
Generator addresses feedback
       │
       ▼
QA re-reviews
       │
       ▼
[Pass] ──▶ Supervisor
[Fail] ──▶ Generator (repeat)
```

### Loop 2: Supervisor → Generator

Triggered when Supervisor rejects:

```
Supervisor rejects
       │
       ▼
Generator fixes issues
       │
       ▼
QA reviews (if required)
       │
       ▼
Supervisor re-evaluates
```

---

## Escalation Rules

### Scenario 1: Generator-QA Disagreement

**Condition**: Generator disagrees with QA feedback

**Process**:
1. Generator provides rationale
2. QA responds with counter-arguments
3. Supervisor reviews both positions
4. Supervisor makes binding decision

### Scenario 2: Unclear Requirements

**Condition**: Requirements are ambiguous

**Process**:
1. QA flags ambiguity
2. Generator clarifies and updates PROMPT.md
3. QA verifies clarification
4. Continue with workflow

### Scenario 3: Scope Change

**Condition**: New requirements discovered

**Process**:
1. Supervisor evaluates impact
2. If minor: Generator updates
3. If major: Restart workflow

---

## Communication Templates

### Generator to QA

```
Subject: Task Suite Ready for Review - group-d-workflow-001

All 7 deliverables are ready for QA review.

Location: /data/codemap/.kimi/tasks/group-d-workflow/

Please review and provide feedback.
```

### QA to Generator

```
Subject: QA Review Complete - group-d-workflow-001

Status: [APPROVED / CHANGES_REQUESTED / REJECTED]

Critical Issues: [count]
Major Issues: [count]
Minor Issues: [count]

[Detailed findings]
```

### QA to Supervisor

```
Subject: QA Approval - group-d-workflow-001

I have reviewed the task suite and recommend [APPROVAL / REJECTION].

Key findings:
- [Finding 1]
- [Finding 2]

Ready for final quality gate.
```

### Supervisor to All

```
Subject: Quality Gate Decision - group-d-workflow-001

Decision: [APPROVED / CONDITIONAL / REJECTED]

Rationale: [Explanation]

Next Steps: [Instructions]
```

---

## Timeline

| Phase | Duration | Agent |
|-------|----------|-------|
| Generation | 90 minutes | Generator |
| QA Review | 65 minutes | QA |
| Revision (if needed) | 30 minutes | Generator |
| Supervision | 20 minutes | Supervisor |
| **Total** | **~3 hours** | **All** |

---

## Success Metrics

- **Completeness**: All 6 modules have test files
- **Coverage**: 100% line coverage target
- **Quality**: All phases pass QA review
- **Efficiency**: Completed within timeline

---

## Notes

- Prefer retrieval-led reasoning over pre-training-led reasoning
- All decisions should be documented
- Each role is independent and cannot be the same agent
- Generator focuses on completeness, QA on correctness, Supervisor on compliance
