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

const REQUIRED_FILES = ["PROMPT.md", "EVAL.ts", "SCORING.md", "task-metadata.yaml"];
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
