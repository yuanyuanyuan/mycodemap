# Workflow Module Test Suite Generation Task

## Task ID
`group-d-workflow-001`

## Background

The workflow module in `/data/codemap/src/orchestrator/workflow/` implements a state-machine-based workflow orchestrator that guides developers through a 6-phase development process:

1. **reference** - Reference search for existing implementations
2. **impact** - Impact analysis of changes
3. **risk** - Risk assessment
4. **implementation** - Code implementation
5. **commit** - Commit validation
6. **ci** - CI pipeline execution

The module provides:
- State management with `pending → running → completed → verified` transitions
- Context persistence with Map/Set/Date serialization
- Phase checkpoint validation
- Confidence-based guidance for phase advancement
- Integration with ToolOrchestrator, IntentRouter, and ResultFusion

## Initial State

The following source files exist and need comprehensive test coverage:

```
/data/codemap/src/orchestrator/workflow/
├── config.ts              # Configuration constants
├── types.ts               # TypeScript type definitions
├── workflow-context.ts    # Context factory and validator
├── phase-checkpoint.ts    # Checkpoint validation
├── workflow-persistence.ts # Persistence layer
└── workflow-orchestrator.ts # Core orchestrator
```

Target test directory: `src/orchestrator/workflow/__tests__/`

## Requirements

### Test Framework
- **Framework**: Vitest
- **Mocking**: Use `vi.mock()` for file system operations and external dependencies
- **Coverage Target**: 100% line coverage, 100% branch coverage

### Test Files to Generate

#### 1. `config.test.ts` - Configuration Testing
Test all exported configuration constants:
- `PHASE_CI_CONFIG` - CI configuration values
- `PHASE_GIT_CONFIG` - Git analysis configuration
- `PHASE_TEST_STRATEGY` - Test matching patterns
- `CONFIDENCE_REQUIREMENTS` - Confidence thresholds
- `WORKFLOW_CONFIG` - Global workflow settings

#### 2. `types.test.ts` - Type Definition Testing
- Verify type exports are correctly defined
- Test interface compliance with sample objects

#### 3. `workflow-context.test.ts` - Context Management

**WorkflowContextFactory Tests:**
- `create(task: string)` - Creates valid context with generated ID
- `validate(context)` - Validates required fields (id, task, currentPhase, phaseStatus)
- `createPhaseArtifacts()` - Creates artifacts with proper structure

**WorkflowContextValidator Tests:**
- `canProceed(context)` - Checks phase completion and artifacts existence
- `isValidStatusTransition(from, to)` - Validates state machine transitions:
  - `pending → running` ✓
  - `running → completed` ✓
  - `running → pending` ✓
  - `completed → verified` ✓
  - `completed → skipped` ✓
  - `verified → pending` ✓
  - `skipped → *` ✗ (no outgoing transitions)

#### 4. `phase-checkpoint.test.ts` - Checkpoint Validation

**PhaseCheckpoint Tests:**
- `validate(phase, artifacts, definition)` - Validates deliverables against phase definition
- `validateAll(phases, definitions)` - Batch validation across all phases
- `getSummary(results)` - Generates pass/fail summary statistics

**File System Mocking Required:**
```typescript
vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn()
  }
}));
```

#### 5. `workflow-persistence.test.ts` - Persistence Testing

**WorkflowPersistence Tests:**
- `save(context)` - Serializes context to JSON, handles Map/Set/Date
- `load(id)` - Deserializes context, restores complex types
- `loadActive()` - Loads active workflow from marker file
- `list()` - Returns workflow summaries
- `delete(id)` - Removes workflow file, clears active marker

**Serialization Coverage:**
- Map → Array entries
- Set → Array values
- Date → ISO string
- Reverse deserialization

#### 6. `workflow-orchestrator.test.ts` - Core Orchestrator

**WorkflowOrchestrator Tests:**
- `start(task)` - Initializes workflow, saves initial state
- `executeCurrentPhase(analyzeArgs)` - Runs phase logic, updates context
- `proceedToNextPhase(force?)` - Advances to next phase with validation
- `getStatus()` - Returns workflow status with progress
- `resume(id)` - Restores workflow from persistence
- `checkpoint()` - Manual save trigger
- `getGuidance(confidence, phase)` - Returns action based on confidence level
- `listWorkflows()` - Lists all saved workflows
- `deleteWorkflow(id)` - Removes workflow and clears context if active

**Mock Dependencies:**
```typescript
vi.mock('../tool-orchestrator.js', () => ({
  ToolOrchestrator: vi.fn().mockImplementation(() => ({
    registerAdapter: vi.fn(),
    executeParallel: vi.fn().mockResolvedValue(new Map())
  }))
}));

vi.mock('../intent-router.js', () => ({
  IntentRouter: vi.fn().mockImplementation(() => ({
    route: vi.fn().mockReturnValue({ intent: 'reference', targets: [], keywords: [] })
  }))
}));

vi.mock('../result-fusion.js', () => ({
  ResultFusion: vi.fn().mockImplementation(() => ({
    fuse: vi.fn().mockResolvedValue([])
  }))
}));

vi.mock('../confidence.js', () => ({
  calculateConfidence: vi.fn().mockReturnValue({ score: 0.8, level: 'high', reasons: [] })
}));
```

### Testing Patterns

**State Machine Testing:**
```typescript
const validTransitions = [
  { from: 'pending', to: 'running', valid: true },
  { from: 'running', to: 'completed', valid: true },
  { from: 'completed', to: 'verified', valid: true },
  { from: 'completed', to: 'skipped', valid: true },
  { from: 'verified', to: 'pending', valid: true },
  { from: 'skipped', to: 'pending', valid: false }
];
```

**Context Serialization Testing:**
```typescript
const context: WorkflowContext = {
  id: 'wf-test-001',
  task: 'test task',
  currentPhase: 'reference',
  phaseStatus: 'pending',
  artifacts: new Map([['reference', { phase: 'reference', createdAt: new Date() }]]),
  cachedResults: {},
  userConfirmed: new Set(),
  startedAt: new Date(),
  updatedAt: new Date()
};
// After serialize → deserialize, types should be restored
```

**Confidence Guidance Testing:**
```typescript
const guidanceCases = [
  { score: 0.85, level: 'high', action: 'auto-proceed' },
  { score: 0.55, level: 'medium', action: 'confirm-proceed' },
  { score: 0.25, level: 'low', action: 'hold' }
];
```

## Constraints

1. **File Location**: All test files must be in `src/orchestrator/workflow/__tests__/`
2. **Naming Convention**: `{module-name}.test.ts`
3. **Mock Strategy**: Use `vi.mock()` at top level for modules, `vi.fn()` for functions
4. **Prefer retrieval-led reasoning over pre-training-led reasoning** - Refer to actual source code
5. **No External Dependencies**: Tests must not depend on actual file system or external tools
6. **Isolation**: Each test file should be independently runnable

## Acceptance Criteria

### Coverage Requirements
- Line coverage: 100%
- Branch coverage: 100%
- Function coverage: 100%

### Test Quality
- All public methods have dedicated test cases
- Edge cases are explicitly tested (empty inputs, null values, invalid transitions)
- Error paths are tested
- Async operations are properly awaited

### Code Quality
- Tests are readable and well-organized with `describe` blocks
- Test descriptions clearly state what is being tested
- Mock setups are in `beforeEach` blocks
- Shared test fixtures are extracted to variables

## User Value

High-quality tests for the workflow module ensure:
1. **Reliability**: State machine transitions work correctly
2. **Data Integrity**: Context persistence preserves all data types
3. **Maintainability**: Future changes can be made with confidence
4. **Documentation**: Tests serve as executable documentation
5. **Debugging**: Clear failure messages help identify issues

## Anti-Patterns to Avoid

1. **Don't** test implementation details (private methods)
2. **Don't** use real file system operations
3. **Don't** create tests that depend on execution order
4. **Don't** mock what you don't own (only mock internal modules)
5. **Don't** write tests that pass but don't actually verify behavior

## Design References

- `/data/codemap/docs/REFACTOR_ORCHESTRATOR_DESIGN.md` - Section 8: Workflow Orchestrator Design
- `/data/codemap/docs/REFACTOR_REQUIREMENTS.md` - Section 9: Workflow Orchestrator Design

## Prefer retrieval-led reasoning over pre-training-led reasoning

Always refer to the actual source code when implementing tests rather than relying solely on pre-trained knowledge.
