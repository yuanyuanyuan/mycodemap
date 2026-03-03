// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] 提供基于 AST 的精确圈复杂度计算，支持函数级复杂度详情分析

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export interface FunctionComplexity {
  name: string;
  kind: 'function' | 'method' | 'constructor';
  line: number;
  column: number;
  cyclomatic: number;
  cognitive: number;
  nestingDepth: number;
  isHighComplexity: boolean;
}

export interface FileComplexity {
  filePath: string;
  relativePath: string;
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  functions: number;
  classes: number;
  lines: number;
  functionDetails: FunctionComplexity[];
}

export interface ComplexityAnalysisResult {
  files: FileComplexity[];
  summary: {
    totalFiles: number;
    averageCyclomatic: number;
    averageCognitive: number;
    averageMaintainability: number;
    highComplexityFunctions: number;
  };
}

// 高复杂度阈值
const HIGH_COMPLEXITY_THRESHOLD = 10;

/**
 * 基于 AST 分析单个文件的圈复杂度
 */
function analyzeFileWithAST(filePath: string, sourceCode: string): FileComplexity {
  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const functionDetails: FunctionComplexity[] = [];

  // 遍历 AST 节点
  function visit(node: ts.Node, context: { depth: number; inFunction: boolean; functionName: string; functionKind: 'function' | 'method' | 'constructor'; functionStart: ts.LineAndCharacter }) {
    // 检测函数/方法
    let currentFunction = context.inFunction;
    let functionName = context.functionName;
    let functionKind = context.functionKind;
    let functionStart = context.functionStart;
    let cyclomatic = 1;
    let maxDepth = 0;
    let currentDepth = 0;

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
      currentFunction = true;
      functionName = node.name?.getText(sourceFile) || '<anonymous>';
      functionKind = ts.isFunctionDeclaration(node) ? 'function' : ts.isMethodDeclaration(node) ? 'method' : 'constructor';
      functionStart = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      cyclomatic = 1;
      currentDepth = 0;
    }

    // 计算控制流复杂度
    if (currentFunction) {
      if (ts.isIfStatement(node) || ts.isWhileStatement(node) ||
          ts.isForStatement(node) || ts.isForInStatement(node) ||
          ts.isForOfStatement(node) || ts.isCaseClause(node) ||
          ts.isCatchClause(node) || ts.isConditionalExpression(node)) {
        cyclomatic++;
      }

      // 三元运算符增加复杂度
      if (ts.isConditionalExpression(node)) {
        cyclomatic++; // 三元运算符算作一个分支
      }

      // 逻辑运算符增加复杂度
      if (ts.isBinaryExpression(node)) {
        const operator = node.operatorToken.kind;
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
            operator === ts.SyntaxKind.BarBarToken) {
          // && 和 || 每个增加一个分支
          cyclomatic++;
        }
      }
    }

    // 计算嵌套深度
    if (ts.isIfStatement(node) || ts.isWhileStatement(node) ||
        ts.isForStatement(node) || ts.isForInStatement(node) ||
        ts.isForOfStatement(node) || ts.isSwitchStatement(node) ||
        ts.isTryStatement(node)) {
      currentDepth = context.depth + 1;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    // 类计数
    if (ts.isClassDeclaration(node)) {
      classCount++;
    }

    // 递归遍历子节点
    ts.forEachChild(node, child => {
      visit(child, {
        depth: currentDepth,
        inFunction: currentFunction,
        functionName,
        functionKind,
        functionStart
      });
    });

    // 在函数结束时记录复杂度
    if (currentFunction && (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node))) {
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      functionDetails.push({
        name: functionName,
        kind: functionKind,
        line: functionStart.line + 1,
        column: functionStart.character + 1,
        cyclomatic,
        cognitive: cyclomatic + maxDepth * 2, // 认知复杂度考虑嵌套深度
        nestingDepth: maxDepth,
        isHighComplexity: cyclomatic >= HIGH_COMPLEXITY_THRESHOLD
      });
    }
  }

  // 先收集所有函数信息，然后计算文件级别的复杂度
  const allFunctions: Array<{ name: string; kind: string; line: number; cyclomatic: number; cognitive: number; nestingDepth: number }> = [];

  function collectFunctions(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
      const name = node.name?.getText(sourceFile) || '<anonymous>';
      const kind = ts.isFunctionDeclaration(node) ? 'function' : ts.isMethodDeclaration(node) ? 'method' : 'constructor';
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

      let cyclomatic = 1;
      let maxDepth = 0;

      // 统计函数内的控制流
      function countControlFlow(n: ts.Node, depth: number) {
        if (ts.isIfStatement(n) || ts.isWhileStatement(n) ||
            ts.isForStatement(n) || ts.isForInStatement(n) ||
            ts.isForOfStatement(n) || ts.isCaseClause(n) ||
            ts.isCatchClause(n)) {
          cyclomatic++;
        }
        if (ts.isConditionalExpression(n)) {
          cyclomatic++;
        }
        if (ts.isBinaryExpression(n)) {
          const operator = n.operatorToken.kind;
          if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
              operator === ts.SyntaxKind.BarBarToken) {
            cyclomatic++;
          }
        }

        if (ts.isIfStatement(n) || ts.isWhileStatement(n) ||
            ts.isForStatement(n) || ts.isForInStatement(n) ||
            ts.isForOfStatement(n) || ts.isSwitchStatement(n) ||
            ts.isTryStatement(n)) {
          maxDepth = Math.max(maxDepth, depth + 1);
        }

        ts.forEachChild(n, child => countControlFlow(child, ts.isBlock(n) ? depth : depth + (ts.isIfStatement(n) || ts.isWhileStatement(n) || ts.isForStatement(n) ? 1 : 0)));
      }

      countControlFlow(node, 0);

      allFunctions.push({
        name,
        kind,
        line: start.line + 1,
        cyclomatic,
        cognitive: cyclomatic + maxDepth * 2,
        nestingDepth: maxDepth
      });
    }
    ts.forEachChild(node, collectFunctions);
  }

  collectFunctions(sourceFile);

  // 统计类数量
  let classCount = 0;
  function countClasses(n: ts.Node) {
    if (ts.isClassDeclaration(n)) {
      classCount++;
    }
    ts.forEachChild(n, countClasses);
  }
  countClasses(sourceFile);

  // 计算文件级别的圈复杂度
  let fileCyclomatic = 1;
  function countFileControlFlow(n: ts.Node) {
    if (ts.isIfStatement(n) || ts.isWhileStatement(n) ||
        ts.isForStatement(n) || ts.isForInStatement(n) ||
        ts.isForOfStatement(n) || ts.isCatchClause(n)) {
      fileCyclomatic++;
    }
    // switch 语句: 每个 case 增加复杂度 (不包括 default)
    if (ts.isCaseClause(n)) {
      fileCyclomatic++;
    }
    // 三元运算符增加复杂度
    if (ts.isConditionalExpression(n)) {
      fileCyclomatic++;
    }
    if (ts.isBinaryExpression(n)) {
      const operator = n.operatorToken.kind;
      if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
          operator === ts.SyntaxKind.BarBarToken) {
        fileCyclomatic++;
      }
    }
    ts.forEachChild(n, countFileControlFlow);
  }
  countFileControlFlow(sourceFile);

  // 计算认知复杂度（考虑嵌套）
  let maxNesting = 0;
  function countNesting(n: ts.Node, depth: number) {
    if (ts.isIfStatement(n) || ts.isWhileStatement(n) ||
        ts.isForStatement(n) || ts.isForInStatement(n) ||
        ts.isForOfStatement(n) || ts.isSwitchStatement(n) ||
        ts.isTryStatement(n)) {
      maxNesting = Math.max(maxNesting, depth + 1);
    }
    ts.forEachChild(n, child => countNesting(child, ts.isBlock(n) ? depth : depth));
  }
  countNesting(sourceFile, 0);

  const fileCognitive = fileCyclomatic + maxNesting * 2;

  // 计算可维护性指数
  const lines = sourceCode.split('\n').length;
  const commentLines = sourceCode.split('\n').filter(line =>
    line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')
  ).length;
  const commentRatio = commentLines / Math.max(1, lines);

  const maintainability = calculateMaintainabilityIndex(lines, fileCyclomatic, commentRatio);

  return {
    filePath,
    relativePath: path.basename(filePath),
    cyclomatic: fileCyclomatic,
    cognitive: fileCognitive,
    maintainability,
    functions: allFunctions.length,
    classes: classCount,
    lines,
    functionDetails: allFunctions.map(f => ({
      name: f.name,
      kind: f.kind as 'function' | 'method' | 'constructor',
      line: f.line,
      column: 1,
      cyclomatic: f.cyclomatic,
      cognitive: f.cognitive,
      nestingDepth: f.nestingDepth,
      isHighComplexity: f.cyclomatic >= HIGH_COMPLEXITY_THRESHOLD
    }))
  };
}

/**
 * 计算可维护性指数
 */
function calculateMaintainabilityIndex(loc: number, cyclomatic: number, commentRatio: number): number {
  const normalizedLOC = Math.max(1, loc);
  const normalizedCC = Math.max(1, cyclomatic);

  let mi = 100;
  mi -= (normalizedCC - 1) * 2;
  mi -= Math.log(normalizedLOC / 10 + 1) * 5;
  mi += commentRatio * 15;

  return Math.max(0, Math.min(100, Math.round(mi)));
}

/**
 * 分析文件复杂度（公开 API）
 */
export function analyzeFileComplexity(filePath: string): FileComplexity {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  return analyzeFileWithAST(filePath, sourceCode);
}

/**
 * 分析多个文件复杂度（公开 API）
 */
export function analyzeMultipleFiles(filePaths: string[], rootDir?: string): ComplexityAnalysisResult {
  const files: FileComplexity[] = [];

  for (const filePath of filePaths) {
    try {
      const result = analyzeFileComplexity(filePath);
      if (rootDir) {
        result.relativePath = path.relative(rootDir, filePath);
      }
      files.push(result);
    } catch (error) {
      console.warn(`警告: 无法分析文件 ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (files.length === 0) {
    return {
      files: [],
      summary: {
        totalFiles: 0,
        averageCyclomatic: 0,
        averageCognitive: 0,
        averageMaintainability: 0,
        highComplexityFunctions: 0
      }
    };
  }

  const totalCyclomatic = files.reduce((sum, f) => sum + f.cyclomatic, 0);
  const totalCognitive = files.reduce((sum, f) => sum + f.cognitive, 0);
  const totalMaintainability = files.reduce((sum, f) => sum + f.maintainability, 0);
  const highComplexityFunctions = files.reduce((sum, f) =>
    sum + f.functionDetails.filter(d => d.isHighComplexity).length, 0);

  return {
    files,
    summary: {
      totalFiles: files.length,
      averageCyclomatic: Math.round(totalCyclomatic / files.length),
      averageCognitive: Math.round(totalCognitive / files.length),
      averageMaintainability: Math.round(totalMaintainability / files.length),
      highComplexityFunctions
    }
  };
}
