# E2E Test Cases — Workflow Full-Flow

> Version: 1.0 | Date: 2026-04-20
> Scope: `tests/e2e/workflow-fullflow.e2e.test.ts`
> Target: `WorkflowOrchestrator` + `WorkflowTemplateManager` + `PhaseInheritance` + `ResultFusion`

## Test Matrix

| ID | User Pain Point | Entry Point | Key API | Assertion Focus |
|---|---|---|---|---|
| E2E-001 | Refactor without knowing impact | `start("重构 auth 模块")` | `start→executeCurrentPhase→proceedToNextPhase` | Phase order, result inheritance, artifacts persisted |
| E2E-002 | Production bug, need fast triage | `start("urgent fix token undefined")` | `start→applyTemplate→executeCurrentPhase` | Template=hotfix, low thresholds, full completion |
| E2E-003 | Analysis interrupted, resume needed | `start→checkpoint→resume` | `checkpoint→resume→proceedToNextPhase` | Context preserved, artifacts intact, phase correct |
| E2E-004 | Wrong template for wrong task | `recommendTemplate(task)` | `recommendTemplate` | Keyword→template mapping, threshold differences |
| E2E-005 | Large repo, performance concern | `start` + large mock results | `executeCurrentPhase` with topK | topK truncation, accumulatedContext bounded, <1s |
| E2E-006 | Low confidence blocks progression | `start` + low-quality results | `canProceed→getGuidance` | Validation fails, guidance=hold |
| E2E-007 | Built-in templates don't fit | `saveTemplate→start(template)` | `saveTemplate→applyTemplate` | Custom thresholds生效, phase definitions from custom |

## Detailed Cases

### E2E-001: Refactoring Pre-Flight Check

```yaml
given:
  project: "has auth module with 12 dependents"
  task: "重构 auth 模块"
when:
  - orchestrator.start("重构 auth 模块")
  - orchestrator.executeCurrentPhase(analyzeArgs)  # find
  - orchestrator.proceedToNextPhase()              # → read
  - orchestrator.executeCurrentPhase(analyzeArgs)  # read
  - orchestrator.proceedToNextPhase()              # → link
  - orchestrator.executeCurrentPhase(analyzeArgs)  # link
  - orchestrator.proceedToNextPhase()              # → show
  - orchestrator.executeCurrentPhase(analyzeArgs)  # show
then:
  - context.currentPhase === 'show'
  - context.artifacts.has('find') === true
  - context.artifacts.has('read') === true
  - context.artifacts.has('link') === true
  - context.artifacts.has('show') === true
  - `canProceed` is returned as a boolean and can be forced through by the caller
  - show phase results include files from find+read+link (via inheritance)
```

### E2E-002: Hotfix Fast-Track

```yaml
given:
  task: "urgent fix token undefined error"
when:
  - template = recommendTemplate(task)
  - orchestrator.start(task, { template: template.name })
  - orchestrator.executeCurrentPhase(analyzeArgs)  # find (threshold 0.1)
  - orchestrator.proceedToNextPhase()
  - orchestrator.executeCurrentPhase(analyzeArgs)  # read (threshold 0.2)
  - orchestrator.proceedToNextPhase()
then:
  - template.name === 'hotfix'
  - template.phases[0].entryCondition.minConfidence === 0.1
  - full workflow completes without confidence blocks
  - context.templateName === 'hotfix'
```

### E2E-003: Checkpoint & Resume

```yaml
given:
  task: "测试断点续跑"
when:
  - orchestrator.start(task)
  - orchestrator.executeCurrentPhase(analyzeArgs)  # find
  - orchestrator.proceedToNextPhase()              # → read
  - orchestrator.executeCurrentPhase(analyzeArgs)  # read
  - orchestrator.checkpoint()
  - # simulate restart: new orchestrator instance
  - orchestrator2 = new WorkflowOrchestrator()
  - orchestrator2.resume(originalContextId)
  - orchestrator2.proceedToNextPhase()             # read → link
  - orchestrator2.executeCurrentPhase(analyzeArgs) # link
  - orchestrator2.proceedToNextPhase()             # → show
  - orchestrator2.executeCurrentPhase(analyzeArgs) # show
then:
  - resumed context.task === "测试断点续跑"
  - resumed context.currentPhase === 'read'
  - resumed context.artifacts.has('find') === true
  - resumed context.artifacts.has('read') === true
  - resumed context.artifacts.has('link') === false (not yet executed)
  - after continue: context.currentPhase === 'show'
  - after continue: context.artifacts.has('link') === true
```

### E2E-004: Template Recommendation

```yaml
cases:
  - input: "fix login bug"
    expected: bugfix
    expected_find_threshold: 0.2
  - input: "add user profile feature"
    expected: feature
    expected_find_threshold: 0.4
  - input: "refactor payment module"
    expected: refactoring
    expected_find_threshold: 0.3
  - input: "urgent critical hotfix security"
    expected: hotfix
    expected_find_threshold: 0.1
  - input: "随便看看"
    expected: refactoring  # default fallback
    expected_find_threshold: 0.3
```

### E2E-005: Large Repo Performance

```yaml
given:
  mock_results: 1000 UnifiedResult items
  topK: 8
when:
  - orchestrator.start("large repo analysis")
  - orchestrator.executeCurrentPhase({ ...analyzeArgs, topK: 8 })
then:
  - phase results.length ≤ 8
  - execution time < 1000ms
  - after 4 phases with 100 results each:
    - accumulatedContext.size === 100 * 4 (stores all deduped historical results)
    - phaseResults.size === 4
    - no memory leak indicators
```

### E2E-006: Low Confidence Blocks Progression

```yaml
given:
  task: "模糊任务描述"
  mock_results: 1 item with relevance 0.1
when:
  - orchestrator.start(task)
  - orchestrator.executeCurrentPhase(analyzeArgs)  # find, returns low quality
  - validation = WorkflowContextValidator.canProceed(context)
  - guidance = orchestrator.getGuidance(confidence, 'find')
then:
  - if confidence.score < 0.3 (find threshold):
    - canProceed.valid === false (phase not completed with sufficient quality)
  - guidance.action === 'hold'
  - guidance.message includes confidence score
  - orchestrator.proceedToNextPhase() (without force) throws Error
  - orchestrator.proceedToNextPhase(true) (with force) succeeds
```

### E2E-007: Custom Template

```yaml
given:
  custom_template:
    name: "team-security-audit"
    type: "custom"
    phases:
      - find: minConfidence=0.5
      - read: minConfidence=0.6
      - link: minConfidence=0.5
      - show: minConfidence=0.3
when:
  - templateManager.saveTemplate(customTemplate)
  - orchestrator.start("security audit", { template: "team-security-audit" })
  - phaseDefs = orchestrator.getAllPhaseDefinitions()
then:
  - phaseDefs[0].entryCondition.minConfidence === 0.5
  - phaseDefs[1].entryCondition.minConfidence === 0.6
  - context.templateName === "team-security-audit"
  - workflow completes with custom thresholds
```

## Implementation Notes

- **Test isolation**: Each test creates a temp dir and new `WorkflowOrchestrator` instance
- **Mock strategy**: Fusion / inheritance cases use synthetic results directly; orchestrator flow cases run real workflow code paths
- **Real integration**: `WorkflowPersistence`, `WorkflowContextFactory`, `WorkflowContextValidator` must be real instances
- **Phase names**: Use current code's 4-phase model: `find → read → link → show` (NOT the old 6-phase model)
- **Confidence**: Use real `calculateConfidence()` when possible; only mock when results are synthetic
