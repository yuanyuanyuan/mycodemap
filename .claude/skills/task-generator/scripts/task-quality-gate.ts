import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

interface CliOptions {
  tasksDir: string;
  completeOnly: boolean;
  contextFile: string | null;
  requireContext: boolean;
  maxContextKb: number;
  json: boolean;
  help: boolean;
}

interface TaskReport {
  name: string;
  path: string;
  complete: boolean;
  skipped: boolean;
  errors: string[];
}

interface GateSummary {
  scannedTasks: number;
  checkedTasks: number;
  skippedTasks: number;
  failedTasks: number;
  passedTasks: number;
  contextChecked: number;
  contextFailed: number;
}

interface ContextReport {
  enabled: boolean;
  checked: boolean;
  filePath: string | null;
  blockSizeBytes: number | null;
  errors: string[];
}

const REQUIRED_FILES = [
  "PROMPT.md",
  "EVAL.ts",
  "SCORING.md",
  "task-metadata.yaml",
  "TRIAD_ROLES.yaml",
  "TRIAD_WORKFLOW.md",
  "TRIAD_ACCEPTANCE.md",
  "SUPERVISOR_SEMANTIC_REVIEW.md",
];
const PROMPT_SECTIONS = [
  "## 背景",
  "## 要求",
  "## 初始状态",
  "## 约束条件",
  "## 验收标准",
  "## 用户价值",
  "## 反例场景",
];
const METADATA_KEYS = [
  "metadata",
  "task",
  "capabilities",
  "traps",
  "counter_examples",
  "workflow",
  "version_history",
];
const CONTEXT_START_MARKER = "<!-- TASK-GENERATOR-CONTEXT-START -->";
const CONTEXT_END_MARKER = "<!-- TASK-GENERATOR-CONTEXT-END -->";
const RETRIEVAL_HINT = "Prefer retrieval-led reasoning over pre-training-led reasoning";

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    tasksDir: ".tasks",
    completeOnly: false,
    contextFile: null,
    requireContext: false,
    maxContextKb: 12,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--tasks-dir") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--tasks-dir requires a value");
      }
      options.tasksDir = next;
      i += 1;
      continue;
    }

    if (arg === "--complete-only") {
      options.completeOnly = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--context-file") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--context-file requires a value");
      }
      options.contextFile = next;
      i += 1;
      continue;
    }

    if (arg === "--require-context") {
      options.requireContext = true;
      continue;
    }

    if (arg === "--max-context-kb") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--max-context-kb requires a value");
      }
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--max-context-kb must be a positive number");
      }
      options.maxContextKb = parsed;
      i += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(`Task Quality Gate

Usage:
  node task-quality-gate.js [options]

Options:
  --tasks-dir <path>   Task directory to scan (default: .tasks)
  --complete-only      Only check fully generated task folders
  --context-file <path>
                       Validate persistent context block in this file
  --require-context    Require persistent context block (default file: AGENTS.md)
  --max-context-kb <n> Max context block size in KB (default: 12)
  --json               Output JSON report
  -h, --help           Show help
`);
}

function isDirectory(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function hasLevelMarkers(evalContent: string): boolean {
  const classic = ["Level 1", "Level 2", "Level 3"].every((marker) =>
    evalContent.includes(marker),
  );
  const bracket = ["[L1]", "[L2]", "[L3]"].every((marker) =>
    evalContent.includes(marker),
  );
  return classic || bracket;
}

function hasNonAsyncAwait(evalContent: string): boolean {
  const pattern =
    /\b(?:it|test)\s*\([^,\n]+,\s*\(\)\s*=>\s*\{[\s\S]*?\bawait\b[\s\S]*?\}\s*\)/m;
  return pattern.test(evalContent);
}

function parseScoringTotal(scoringContent: string): number | null {
  const pattern = /^\|\s*(?:L\d[\w-]*|\d+)\s*\|[^|\n]*\|\s*(\d+)\s*\|/gm;
  const matches = [...scoringContent.matchAll(pattern)];
  if (matches.length === 0) {
    return null;
  }
  return matches.reduce((sum, match) => sum + Number(match[1]), 0);
}

function checkMetadataTemplate(metadataContent: string): string[] {
  const errors: string[] = [];

  for (const key of METADATA_KEYS) {
    const keyPattern = new RegExp(`^${key}:\\s*$`, "m");
    if (!keyPattern.test(metadataContent)) {
      errors.push(`task-metadata.yaml missing top-level key: ${key}`);
    }
  }

  return errors;
}

function checkTriadWorkflow(metadataContent: string): string[] {
  const errors: string[] = [];

  const requestedCountMatch = metadataContent.match(
    /^\s*requested_count:\s*(\d+)\s*$/m,
  );
  if (!requestedCountMatch) {
    errors.push("task-metadata.yaml missing workflow.batch.requested_count");
  } else {
    const requestedCount = Number(requestedCountMatch[1]);
    if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
      errors.push("workflow.batch.requested_count must be a positive integer");
    } else if (requestedCount > 5) {
      errors.push(
        `workflow.batch.requested_count exceeds limit 5 (actual: ${requestedCount})`,
      );
    }
  }

  if (!/^\s*max_allowed:\s*5\s*$/m.test(metadataContent)) {
    errors.push("workflow.batch.max_allowed must be 5");
  }

  for (const role of ["generator", "qa", "supervisor"]) {
    const rolePattern = new RegExp(`^\\s*${role}:\\s*$`, "m");
    if (!rolePattern.test(metadataContent)) {
      errors.push(`task-metadata.yaml missing workflow.triad.${role} block`);
      continue;
    }

    const statusPattern = new RegExp(
      `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+status:\\s*(?:["']?completed["']?)\\b`,
      "m",
    );
    if (!statusPattern.test(metadataContent)) {
      errors.push(`workflow.triad.${role}.status must be completed`);
    }

    const evidencePattern = new RegExp(
      `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+evidence:\\s*["']?.+`,
      "m",
    );
    if (!evidencePattern.test(metadataContent)) {
      errors.push(`workflow.triad.${role}.evidence must be non-empty`);
    }

    const agentDefinitionPattern = new RegExp(
      `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+agent_definition:\\s*["']?.+`,
      "m",
    );
    if (!agentDefinitionPattern.test(metadataContent)) {
      errors.push(`workflow.triad.${role}.agent_definition must be non-empty`);
    }
  }

  const semanticScoreMatch = metadataContent.match(
    /\n\s*semantic_review:\s*\n(?:\s+.*\n)*?\s+score:\s*(\d+)\s*$/m,
  );
  const semanticThresholdMatch = metadataContent.match(
    /\n\s*semantic_review:\s*\n(?:\s+.*\n)*?\s+threshold:\s*(\d+)\s*$/m,
  );
  const semanticStatusMatch = metadataContent.match(
    /\n\s*semantic_review:\s*\n(?:\s+.*\n)*?\s+status:\s*["']?(completed|failed|pending)["']?\s*$/m,
  );
  if (!semanticScoreMatch || !semanticThresholdMatch || !semanticStatusMatch) {
    errors.push("workflow.triad.supervisor.semantic_review block must include score/threshold/status");
  } else {
    const score = Number(semanticScoreMatch[1]);
    const threshold = Number(semanticThresholdMatch[1]);
    if (!Number.isFinite(score) || !Number.isFinite(threshold) || score < threshold) {
      errors.push(
        `workflow.triad.supervisor.semantic_review score must meet threshold (score=${score}, threshold=${threshold})`,
      );
    }
  }

  if (!/^\s*approved:\s*true\s*$/m.test(metadataContent)) {
    errors.push("workflow.approved must be true");
  }

  return errors;
}

function checkTriadArtifacts(taskPath: string): string[] {
  const errors: string[] = [];
  const rolesPath = path.join(taskPath, "TRIAD_ROLES.yaml");
  const workflowPath = path.join(taskPath, "TRIAD_WORKFLOW.md");
  const acceptancePath = path.join(taskPath, "TRIAD_ACCEPTANCE.md");

  if (!existsSync(rolesPath) || !existsSync(workflowPath) || !existsSync(acceptancePath)) {
    return errors;
  }

  const rolesContent = readFileSync(rolesPath, "utf-8");
  const workflowContent = readFileSync(workflowPath, "utf-8");
  const acceptanceContent = readFileSync(acceptancePath, "utf-8");

  for (const marker of ["generator:", "qa:", "supervisor:"]) {
    if (!rolesContent.includes(marker)) {
      errors.push(`TRIAD_ROLES.yaml missing role definition: ${marker}`);
    }
  }

  for (const marker of ["## generator", "## qa", "## supervisor"]) {
    if (!workflowContent.includes(marker)) {
      errors.push(`TRIAD_WORKFLOW.md missing section: ${marker}`);
    }
  }

  for (const marker of [
    "## Hard Constraints",
    "## Artifact Checklist",
    "## Automated Validation",
  ]) {
    if (!acceptanceContent.includes(marker)) {
      errors.push(`TRIAD_ACCEPTANCE.md missing section: ${marker}`);
    }
  }

  return errors;
}

function parseRoleAgent(metadataContent: string, role: string): string | null {
  const pattern = new RegExp(
    `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+agent:\\s*["']?([^"\\n']+)`,
    "m",
  );
  const matched = metadataContent.match(pattern);
  return matched ? matched[1].trim() : null;
}

function checkAgentDefinitions(taskPath: string, metadataContent: string): string[] {
  const errors: string[] = [];
  const projectRoot = path.resolve(taskPath, "..", "..");
  const agentsDir = path.join(projectRoot, ".agents");
  if (!existsSync(agentsDir)) {
    errors.push(`missing .agents directory: ${agentsDir}`);
    return errors;
  }

  for (const role of ["generator", "qa", "supervisor"]) {
    const agentName = parseRoleAgent(metadataContent, role);
    if (!agentName) {
      errors.push(`missing workflow.triad.${role}.agent`);
      continue;
    }
    const agentPath = path.join(agentsDir, `${agentName}.agent.md`);
    if (!existsSync(agentPath)) {
      errors.push(`missing ${role} agent definition: ${agentPath}`);
    }
  }

  const supervisorName = parseRoleAgent(metadataContent, "supervisor");
  if (supervisorName) {
    const semanticPromptPath = path.join(
      agentsDir,
      `${supervisorName}.semantic.prompt.md`,
    );
    if (!existsSync(semanticPromptPath)) {
      errors.push(`missing supervisor semantic prompt: ${semanticPromptPath}`);
    }
  }

  return errors;
}

function checkSupervisorSemanticReport(taskPath: string): string[] {
  const errors: string[] = [];
  const reportPath = path.join(taskPath, "SUPERVISOR_SEMANTIC_REVIEW.md");
  if (!existsSync(reportPath)) {
    errors.push("missing SUPERVISOR_SEMANTIC_REVIEW.md");
    return errors;
  }

  const content = readFileSync(reportPath, "utf-8");
  for (const marker of ["## Semantic Dimensions", "## Critical Failure Modes", "## Decision"]) {
    if (!content.includes(marker)) {
      errors.push(`SUPERVISOR_SEMANTIC_REVIEW.md missing section: ${marker}`);
    }
  }

  const scoreMatch = content.match(/^- score:\s*(\d+)\s*$/m);
  const thresholdMatch = content.match(/^- threshold:\s*(\d+)\s*$/m);
  const passedMatch = content.match(/^- passed:\s*(true|false)\s*$/m);
  if (!scoreMatch || !thresholdMatch || !passedMatch) {
    errors.push("SUPERVISOR_SEMANTIC_REVIEW.md missing score/threshold/passed");
  } else {
    const score = Number(scoreMatch[1]);
    const threshold = Number(thresholdMatch[1]);
    const passed = passedMatch[1] === "true";
    if (!Number.isFinite(score) || !Number.isFinite(threshold) || score < threshold) {
      errors.push(
        `SUPERVISOR_SEMANTIC_REVIEW score below threshold (score=${score}, threshold=${threshold})`,
      );
    }
    if (!passed) {
      errors.push("SUPERVISOR_SEMANTIC_REVIEW passed=false");
    }
  }

  return errors;
}

function countOccurrences(content: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }
  let count = 0;
  let offset = 0;
  while (true) {
    const idx = content.indexOf(needle, offset);
    if (idx === -1) {
      break;
    }
    count += 1;
    offset = idx + needle.length;
  }
  return count;
}

function checkContextBlock(options: CliOptions): ContextReport {
  const shouldCheck = options.requireContext || Boolean(options.contextFile);
  if (!shouldCheck) {
    return {
      enabled: false,
      checked: false,
      filePath: null,
      blockSizeBytes: null,
      errors: [],
    };
  }

  const filePath = path.resolve(process.cwd(), options.contextFile ?? "AGENTS.md");
  const report: ContextReport = {
    enabled: true,
    checked: true,
    filePath,
    blockSizeBytes: null,
    errors: [],
  };

  if (!existsSync(filePath)) {
    report.errors.push(`context file not found: ${filePath}`);
    return report;
  }

  const content = readFileSync(filePath, "utf-8");
  const startCount = countOccurrences(content, CONTEXT_START_MARKER);
  const endCount = countOccurrences(content, CONTEXT_END_MARKER);

  if (startCount !== 1 || endCount !== 1) {
    report.errors.push(
      `context markers must appear exactly once (start=${startCount}, end=${endCount})`,
    );
    return report;
  }

  const startIdx = content.indexOf(CONTEXT_START_MARKER);
  const endIdx = content.indexOf(CONTEXT_END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    report.errors.push("context marker order is invalid");
    return report;
  }

  const block = content.slice(startIdx, endIdx + CONTEXT_END_MARKER.length);
  const blockSizeBytes = Buffer.byteLength(block, "utf-8");
  report.blockSizeBytes = blockSizeBytes;

  if (blockSizeBytes > options.maxContextKb * 1024) {
    report.errors.push(
      `context block too large: ${blockSizeBytes} bytes (max ${Math.round(options.maxContextKb * 1024)} bytes)`,
    );
  }

  if (!block.includes("[Task Knowledge Index]") || !block.includes("|")) {
    report.errors.push(
      "context block should use compact index format like [Task Knowledge Index]|...",
    );
  }

  if (!/root:\s*[^|<\n]+/.test(block)) {
    report.errors.push("context block missing root path declaration (root: ...)");
  }

  if (!block.includes(RETRIEVAL_HINT)) {
    report.errors.push(
      `context block missing retrieval hint: "${RETRIEVAL_HINT}"`,
    );
  }

  if (!block.includes("If context missing, regenerate")) {
    report.errors.push(
      'context block missing recovery instruction: "If context missing, regenerate..."',
    );
  }

  return report;
}

function checkTask(taskPath: string, options: CliOptions): TaskReport {
  const name = path.basename(taskPath);
  const report: TaskReport = {
    name,
    path: taskPath,
    complete: false,
    skipped: false,
    errors: [],
  };

  const files = new Set(readdirSync(taskPath));
  const missingFiles = REQUIRED_FILES.filter((file) => !files.has(file));
  report.complete = missingFiles.length === 0;

  if (!report.complete) {
    if (options.completeOnly) {
      report.skipped = true;
      return report;
    }

    for (const missing of missingFiles) {
      report.errors.push(`missing required file: ${missing}`);
    }
    return report;
  }

  const promptPath = path.join(taskPath, "PROMPT.md");
  const evalPath = path.join(taskPath, "EVAL.ts");
  const scoringPath = path.join(taskPath, "SCORING.md");
  const metadataPath = path.join(taskPath, "task-metadata.yaml");

  const promptContent = readFileSync(promptPath, "utf-8");
  const evalContent = readFileSync(evalPath, "utf-8");
  const scoringContent = readFileSync(scoringPath, "utf-8");
  const metadataContent = readFileSync(metadataPath, "utf-8");

  for (const section of PROMPT_SECTIONS) {
    if (!promptContent.includes(section)) {
      report.errors.push(`PROMPT.md missing section: ${section}`);
    }
  }

  if (!evalContent.includes("process.cwd()")) {
    report.errors.push("EVAL.ts must derive paths from process.cwd()");
  }

  if (!hasLevelMarkers(evalContent)) {
    report.errors.push("EVAL.ts must include Level markers (Level 1/2/3 or [L1]/[L2]/[L3])");
  }

  if (!/\.not\.(toMatch|toContain|toBe)\s*\(/.test(evalContent)) {
    report.errors.push("EVAL.ts must include at least one negative assertion (.not.toX)");
  }

  if (hasNonAsyncAwait(evalContent)) {
    report.errors.push("EVAL.ts contains await in non-async test callback");
  }

  if (/from\s+["']chai["']/.test(evalContent)) {
    report.errors.push("EVAL.ts should not import chai (use vitest expect only)");
  }

  const scoringTotal = parseScoringTotal(scoringContent);
  if (scoringTotal === null) {
    report.errors.push("SCORING.md scoring rows not parseable");
  } else if (scoringTotal !== 100) {
    report.errors.push(`SCORING.md total points must be 100 (actual: ${scoringTotal})`);
  }

  report.errors.push(...checkMetadataTemplate(metadataContent));
  report.errors.push(...checkTriadWorkflow(metadataContent));
  report.errors.push(...checkTriadArtifacts(taskPath));
  report.errors.push(...checkAgentDefinitions(taskPath, metadataContent));
  report.errors.push(...checkSupervisorSemanticReport(taskPath));

  return report;
}

function run(options: CliOptions): {
  summary: GateSummary;
  reports: TaskReport[];
  contextReport: ContextReport;
} {
  const taskRoot = path.resolve(process.cwd(), options.tasksDir);
  if (!existsSync(taskRoot) || !isDirectory(taskRoot)) {
    throw new Error(`Task directory not found: ${taskRoot}`);
  }

  const taskDirs = readdirSync(taskRoot)
    .map((entry) => path.join(taskRoot, entry))
    .filter((fullPath) => isDirectory(fullPath));

  const reports = taskDirs
    .map((taskDir) => checkTask(taskDir, options))
    .sort((a, b) => a.name.localeCompare(b.name));

  const checkedReports = reports.filter((report) => !report.skipped);
  const failedReports = checkedReports.filter((report) => report.errors.length > 0);

  const summary: GateSummary = {
    scannedTasks: reports.length,
    checkedTasks: checkedReports.length,
    skippedTasks: reports.length - checkedReports.length,
    failedTasks: failedReports.length,
    passedTasks: checkedReports.length - failedReports.length,
    contextChecked: 0,
    contextFailed: 0,
  };

  const contextReport = checkContextBlock(options);
  if (contextReport.checked) {
    summary.contextChecked = 1;
    summary.contextFailed = contextReport.errors.length > 0 ? 1 : 0;
  }

  return { summary, reports, contextReport };
}

function printTextReport(
  summary: GateSummary,
  reports: TaskReport[],
  contextReport: ContextReport,
): void {
  console.log("Task Quality Gate Report");
  console.log(`scanned: ${summary.scannedTasks}`);
  console.log(`checked: ${summary.checkedTasks}`);
  console.log(`skipped: ${summary.skippedTasks}`);
  console.log(`passed: ${summary.passedTasks}`);
  console.log(`failed: ${summary.failedTasks}`);
  if (summary.contextChecked > 0) {
    console.log(`context-checked: ${summary.contextChecked}`);
    console.log(`context-failed: ${summary.contextFailed}`);
  }

  const failed = reports.filter((report) => report.errors.length > 0);
  const hasContextFailure = contextReport.checked && contextReport.errors.length > 0;
  if (failed.length === 0 && !hasContextFailure) {
    console.log("PASS: all checked tasks passed quality gate");
    return;
  }

  if (failed.length > 0) {
    console.log("FAILURES:");
    for (const report of failed) {
      console.log(`- ${report.name}`);
      for (const error of report.errors) {
        console.log(`  - ${error}`);
      }
    }
  }

  if (hasContextFailure) {
    console.log("CONTEXT FAILURES:");
    console.log(`- file: ${contextReport.filePath ?? "<unknown>"}`);
    for (const error of contextReport.errors) {
      console.log(`  - ${error}`);
    }
  }
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const { summary, reports, contextReport } = run(options);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            summary,
            reports,
            contextReport,
          },
          null,
          2,
        ),
      );
    } else {
      printTextReport(summary, reports, contextReport);
    }

    process.exit(summary.failedTasks === 0 && summary.contextFailed === 0 ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Task quality gate error: ${message}`);
    process.exit(2);
  }
}

main();
