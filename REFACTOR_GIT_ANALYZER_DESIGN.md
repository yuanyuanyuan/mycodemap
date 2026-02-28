# Git 分析器详细设计

> 版本: 2.4
> 所属模块: 编排层 - Git 分析器
> 更新日期: 2026-02-28

---

## 1. 功能定位

在影响分析场景中，分析文件的修改历史，评估修改风险。

**新增功能 (v2.4)**:
- 极简 Commit 格式验证 `[TAG]` 格式
- AI 饲料生成器 (`.codemap/ai-feed.txt`)
- 文件头注释扫描 `[META]`/`[WHY]`/`[DEPS]`
- 基于 GRAVITY/HEAT/IMPACT 的危险置信度计算

---

## 2. 数据结构设计

### 2.1 提交信息

```typescript
// src/orchestrator/git-analyzer.ts

interface CommitInfo {
  hash: string;
  message: string;
  date: Date;
  author: string;
  files: string[];
  tag?: CommitTag;      // [TAG] 解析结果 (v2.4新增)
}

// v2.4 新增: 极简 Commit Tag
interface CommitTag {
  type: 'BUGFIX' | 'FEATURE' | 'REFACTOR' | 'CONFIG' | 'DOCS' | 'DELETE' | 'UNKNOWN';
  scope: string;        // 模块名，如 "git-analyzer"
  subject: string;      // 提交描述
}
```

### 2.2 风险评分 (v2.4 重构)

```typescript
interface RiskScore {
  level: 'high' | 'medium' | 'low';
  score: number;              // 0-1 综合分数
  
  // 维度评分
  gravity: number;            // 依赖复杂度 (出度+入度)
  heat: HeatScore;            // 时间维度活跃度
  impact: number;             // 影响面 (被依赖数)
  
  riskFactors: string[];      // 风险因素说明
}

// v2.4 新增: 热度评分
interface HeatScore {
  freq30d: number;            // 30天内修改次数
  lastType: string;           // 最后提交标签 [BUGFIX]等
  lastDate: Date | null;      // 最后修改日期
  stability: boolean;         // 是否稳定 (沉积岩 vs 火山灰)
}
```

### 2.3 AI 饲料数据结构 (v2.4 新增)

```typescript
// src/orchestrator/ai-feed-generator.ts

interface AIFeed {
  file: string;
  gravity: number;            // 依赖复杂度分数
  heat: HeatScore;            // 时间维度
  meta: FileMeta;             // 文件元数据
  deps: string[];             // 依赖的文件
  dependents: string[];       // 被哪些文件依赖
}

interface FileMeta {
  since?: string;             // 创建时间 2024-01
  owner?: string;             // 负责人/团队
  stable?: boolean;           // 是否稳定
  why?: string;               // 存在理由 (苏格拉底问题)
}
```

### 2.4 文件头注释格式 (v2.4 新增)

```typescript
// src/orchestrator/file-header-scanner.ts

interface FileHeader {
  meta?: {
    since?: string;
    owner?: string;
    stable?: boolean;
  };
  why?: string;               // [WHY] 回答
  deps?: string[];            // [DEPS] 关键依赖
}

// 扫描规则:
// - 检查文件前10行
// - 正则匹配: \/\/ \[META\] (.+)
// - 正则匹配: \/\/ \[WHY\] (.+)
// - 正则匹配: \/\/ \[DEPS\] (.+)
```

---

## 3. 接口设计

### 3.1 Git 分析器类

```typescript
class GitAnalyzer {
  /**
   * 查找相关提交
   * 支持两种模式：关键词搜索 + 文件搜索
   */
  async findRelatedCommits(
    keywords: string[],
    files: string[],
    options: { maxCommits: number; projectRoot: string }
  ): Promise<CommitInfo[]> {
    const commits: CommitInfo[] = [];

    // 1. 关键词搜索（提交信息）
    if (keywords.length > 0) {
      const keywordResults = await this.searchByKeywords(keywords, options.maxCommits);
      commits.push(...keywordResults);
    }

    // 2. 文件搜索（修改过的文件）
    if (files.length > 0) {
      const fileResults = await this.searchByFiles(files, options.maxCommits);
      commits.push(...fileResults);
    }

    // 3. 去重 + 排序（按日期）
    const unique = new Map<string, CommitInfo>();
    for (const commit of commits) {
      if (!unique.has(commit.hash)) {
        unique.set(commit.hash, commit);
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, options.maxCommits);
  }

  // v2.4 新增: 解析极简 Commit Tag
  parseCommitTag(message: string): CommitTag | undefined {
    const match = message.match(/^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]\s*(.+?)?:(.+)$/);
    if (!match) return undefined;
    
    return {
      type: match[1] as CommitTag['type'],
      scope: match[2]?.trim() || 'general',
      subject: match[3].trim()
    };
  }
}
```

### 3.2 关键词搜索

```typescript
private async searchByKeywords(
  keywords: string[],
  limit: number
): Promise<CommitInfo[]> {
  // 使用 execFile + 参数数组避免命令注入
  // 同时限制关键词长度防止过度匹配
  const sanitizedKeywords = keywords
    .slice(0, 5) // 最多 5 个关键词
    .map(k => k.slice(0, 100)) // 每个关键词最多 100 字符
    .filter(k => /^[a-zA-Z0-9_\-\.]+$/.test(k)); // 仅允许安全字符

  if (sanitizedKeywords.length === 0) return [];

  const pattern = sanitizedKeywords.join('|');
  const { stdout } = await execFile('git', [
    'log', '--all', `--grep=${pattern}`,
    '--format=%H|%s|%ai|%an',
    '-n', String(limit)
  ]);

  return this.parseGitLog(stdout);
}
```

### 3.3 文件搜索

```typescript
private async searchByFiles(
  files: string[],
  limit: number
): Promise<CommitInfo[]> {
  // git --follow 语义仅支持单路径，多文件需逐个查询后合并
  const allCommits: CommitInfo[] = [];

  for (const file of files) {
    try {
      const { stdout } = await execFile('git', [
        'log', '--follow', '--format=%H|%s|%ai|%an', '--name-only',
        '-n', String(limit), '--', file
      ]);
      const fileCommits = this.parseGitLogWithFiles(stdout);
      allCommits.push(...fileCommits);
    } catch {
      // 单文件查询失败时跳过
    }
  }

  // 按哈希去重
  const unique = new Map<string, CommitInfo>();
  for (const commit of allCommits) {
    if (!unique.has(commit.hash)) {
      unique.set(commit.hash, commit);
    }
  }

  return Array.from(unique.values());
}
```

### 3.4 风险评分计算 (v2.4 重构)

```typescript
/**
 * 计算风险评分 (v2.4 重构版)
 * 基于 GRAVITY / HEAT / IMPACT 三维模型
 */
calculateRiskScore(
  targetFiles: string[],
  commits: CommitInfo[],
  feedData: AIFeed[]           // AI 饲料数据
): RiskScore {
  // 1. 获取文件饲料数据
  const fileFeeds = feedData.filter(f => targetFiles.includes(f.file));
  
  // 2. 计算 GRAVITY (依赖复杂度)
  const avgGravity = fileFeeds.reduce((sum, f) => sum + f.gravity, 0) / 
                     (fileFeeds.length || 1);
  const gravityScore = Math.min(avgGravity / 20, 1);  // 归一化到 0-1

  // 3. 计算 HEAT (时间维度)
  const totalFreq = fileFeeds.reduce((sum, f) => sum + f.heat.freq30d, 0);
  const avgFreq = totalFreq / (fileFeeds.length || 1);
  const freqScore = Math.min(avgFreq / 10, 1);
  
  // 标签风险权重
  const tagWeights: Record<string, number> = {
    'BUGFIX': 0.9,     // 修复过的代码 = 有风险
    'REFACTOR': 0.8,   // 重构过的代码
    'FEATURE': 0.7,    // 新功能
    'CONFIG': 0.5,
    'DOCS': 0.2,
    'DELETE': 0.1,
    'UNKNOWN': 0.5
  };
  
  const lastTypes = fileFeeds.map(f => f.heat.lastType);
  const avgTagRisk = lastTypes.reduce((sum, t) => sum + (tagWeights[t] || 0.5), 0) / 
                     (lastTypes.length || 1);
  const heatScore = freqScore * 0.5 + avgTagRisk * 0.5;

  // 4. 计算 IMPACT (影响面)
  const totalDependents = fileFeeds.reduce((sum, f) => sum + f.dependents.length, 0);
  const impactScore = Math.min(totalDependents / 50, 1);

  // 5. 稳定性调整
  const unstableCount = fileFeeds.filter(f => f.meta.stable === false).length;
  const stabilityPenalty = unstableCount / (fileFeeds.length || 1) * 0.2;

  // 6. 综合评分
  const totalScore = 
    gravityScore * 0.3 + 
    heatScore * 0.25 + 
    impactScore * 0.1 -
    stabilityPenalty;

  const riskFactors: string[] = [];
  if (gravityScore > 0.7) riskFactors.push('高依赖复杂度');
  if (freqScore > 0.7) riskFactors.push('近期频繁修改');
  if (avgTagRisk > 0.7) riskFactors.push('历史问题较多(BUGFIX频繁)');
  if (impactScore > 0.7) riskFactors.push('影响面广');
  if (unstableCount > 0) riskFactors.push('模块标记为不稳定');

  return {
    level: totalScore > 0.7 ? 'high' : totalScore > 0.4 ? 'medium' : 'low',
    score: totalScore,
    gravity: gravityScore,
    heat: {
      freq30d: Math.round(avgFreq),
      lastType: lastTypes[0] || 'UNKNOWN',
      lastDate: fileFeeds[0]?.heat.lastDate || null,
      stability: unstableCount === 0
    },
    impact: impactScore,
    riskFactors
  };
}
```

### 3.5 日志解析

```typescript
private parseGitLog(stdout: string): CommitInfo[] {
  return stdout.trim().split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [hash, message, date, author] = line.split('|');
      return {
        hash,
        message,
        date: new Date(date),
        author,
        files: [],
        tag: this.parseCommitTag(message)  // v2.4 新增
      };
    });
}
```

---

## 4. AI 饲料生成器 (v2.4 新增)

### 4.1 核心类设计

```typescript
// src/orchestrator/ai-feed-generator.ts

class AIFeedGenerator {
  private gitAnalyzer: GitAnalyzer;
  private headerScanner: FileHeaderScanner;

  constructor(gitAnalyzer: GitAnalyzer) {
    this.gitAnalyzer = gitAnalyzer;
    this.headerScanner = new FileHeaderScanner();
  }

  /**
   * 生成 AI 饲料
   * 集成到 codemap generate 命令
   */
  async generate(projectRoot: string): Promise<AIFeed[]> {
    const files = await globby(['src/**/*.ts'], { cwd: projectRoot });
    const feed: AIFeed[] = [];

    // 第一遍：收集基础信息
    for (const file of files) {
      const fullPath = path.join(projectRoot, file);
      feed.push({
        file,
        gravity: 0,
        heat: this.scanGitHistory(file, projectRoot),
        meta: this.headerScanner.scan(fullPath),
        deps: [],
        dependents: []
      });
    }

    // 第二遍：计算依赖关系
    const fileMap = new Map(feed.map(f => [f.file, f]));
    
    for (const item of feed) {
      const fullPath = path.join(projectRoot, item.file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // 扫描 import 语句
      const imports = [...content.matchAll(/from ['"](\.\.?\/.+?)['"]/g)]
        .map(m => m[1] + '.ts');
      
      item.deps = imports;
      item.gravity = imports.length;

      // 反向建立 dependents
      for (const imp of imports) {
        const target = fileMap.get(imp);
        if (target) target.dependents.push(item.file);
      }
    }

    // 重新计算 gravity (出度 + 入度)
    for (const item of feed) {
      item.gravity = item.deps.length + item.dependents.length;
    }

    return feed.sort((a, b) => b.gravity - a.gravity);
  }

  /**
   * 输出 AI 饲料文件
   */
  writeFeedFile(feed: AIFeed[], outputPath: string): void {
    let output = `# CODEMAP AI FEED\n`;
    output += `# Generated: ${new Date().toISOString()}\n\n`;

    for (const f of feed) {
      output += `FILE: ${f.file}\n`;
      output += `GRAVITY: ${f.gravity} | HEAT: ${f.heat.freq30d}/${f.heat.lastType}/${f.heat.lastDate || 'never'}\n`;
      output += `META: since=${f.meta.since || 'unknown'} stable=${f.meta.stable} why=${f.meta.why || 'none'}\n`;
      output += `IMPACT: ${f.dependents.length} files depend on this\n`;
      output += `DEPS: ${f.deps.join(', ') || 'none'}\n`;
      output += `---\n`;
    }

    fs.writeFileSync(outputPath, output);
  }

  private scanGitHistory(filePath: string, projectRoot: string): HeatScore {
    try {
      const log = execSync(
        `git log --since="30 days ago" --pretty=format:"%s" -- "${filePath}"`,
        { cwd: projectRoot, encoding: 'utf-8' }
      );
      const commits = log.split('\n').filter(Boolean);
      
      const last = commits[0] || '';
      const typeMatch = last.match(/^\[(\w+)\]/);
      
      return {
        freq30d: commits.length,
        lastType: typeMatch ? typeMatch[1] : 'UNKNOWN',
        lastDate: execSync(
          `git log -1 --pretty=format:"%ci" -- "${filePath}"`,
          { cwd: projectRoot, encoding: 'utf-8' }
        ).split(' ')[0] || null,
        stability: commits.length < 3  // 30天内少于3次视为稳定
      };
    } catch {
      return { freq30d: 0, lastType: 'NEW', lastDate: null, stability: true };
    }
  }
}
```

### 4.2 文件头注释扫描器

```typescript
// src/orchestrator/file-header-scanner.ts

class FileHeaderScanner {
  /**
   * 扫描文件头注释
   * 只读取文件前10行
   */
  scan(filePath: string): FileMeta {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').slice(0, 10);
    const header = lines.join('\n');

    // 解析 [META]
    const metaMatch = header.match(/\/\/ \[META\] (.+)/);
    const meta: FileMeta = {};

    if (metaMatch) {
      const metaStr = metaMatch[1];
      meta.since = metaStr.match(/since:(\S+)/)?.[1];
      meta.owner = metaStr.match(/owner:(\S+)/)?.[1];
      meta.stable = metaStr.includes('stable:true');
    }

    // 解析 [WHY]
    const whyMatch = header.match(/\/\/ \[WHY\] (.+)/);
    if (whyMatch) {
      meta.why = whyMatch[1].trim();
    }

    // 解析 [DEPS]
    const depsMatch = header.match(/\/\/ \[DEPS\] (.+)/);
    if (depsMatch) {
      meta.deps = depsMatch[1].split(',').map(d => d.trim());
    }

    return meta;
  }

  /**
   * 验证文件头是否完整
   * CI 门禁使用
   */
  validate(filePath: string): { valid: boolean; missing: string[] } {
    const meta = this.scan(filePath);
    const missing: string[] = [];

    if (!meta.since) missing.push('[META] since');
    if (!meta.why) missing.push('[WHY]');

    return { valid: missing.length === 0, missing };
  }
}
```

---

## 5. 极简 Commit 格式验证 (v2.4 新增)

### 5.1 Commit Tag 正则

```typescript
// src/orchestrator/commit-validator.ts

const COMMIT_TAG_REGEX = /^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]\s*(.+?)?:(.+)$/;

const TAG_DESCRIPTIONS: Record<string, string> = {
  'BUGFIX': '修复问题',
  'FEATURE': '新功能',
  'REFACTOR': '重构',
  'CONFIG': '配置变更',
  'DOCS': '文档',
  'DELETE': '删除代码'
};

class CommitValidator {
  /**
   * 验证 commit message 格式
   * 用于 Git Hook 和 CI
   */
  validate(message: string): { valid: boolean; error?: string } {
    const lines = message.split('\n');
    const firstLine = lines[0].trim();

    // 检查第一行格式
    const match = firstLine.match(COMMIT_TAG_REGEX);
    if (!match) {
      return {
        valid: false,
        error: this.formatError('提交信息必须以大写标签开头')
      };
    }

    const [, tag, scope, subject] = match;

    // 验证标签有效性
    if (!TAG_DESCRIPTIONS[tag]) {
      return {
        valid: false,
        error: `无效的标签: [${tag}]`
      };
    }

    // scope 不能为空（极简方案要求强制 scope）
    if (!scope || scope.trim() === '') {
      return {
        valid: false,
        error: 'scope 不能为空，格式: [TAG] scope: message'
      };
    }

    // subject 不能为空
    if (!subject || subject.trim() === '') {
      return {
        valid: false,
        error: '提交描述不能为空'
      };
    }

    return { valid: true };
  }

  private formatError(msg: string): string {
    const tags = Object.entries(TAG_DESCRIPTIONS)
      .map(([tag, desc]) => `   [${tag}] ${desc}`)
      .join('\n');
    
    return `${msg}\n\n允许的格式:\n${tags}\n\n示例:\n   [BUGFIX] git-analyzer: fix risk score calculation\n   [FEATURE] orchestrator: add confidence scoring`;
  }
}
```

---

## 6. 风险评分策略 (v2.4 更新)

### 6.1 三维评估模型

| 维度 | 指标 | 计算方式 | 权重 |
|------|------|----------|------|
| **GRAVITY** | 依赖复杂度 | (出度 + 入度) / 20 | 30% |
| **HEAT** | 修改热度 | (30天修改次数 / 10) * 0.5 + 标签风险 * 0.5 | 25% |
| **IMPACT** | 影响面 | 被依赖文件数 / 50 | 10% |
| **STABILITY** | 稳定性 | 不稳定文件比例 * -0.2 | - |

### 6.2 标签风险权重

| 标签 | 风险值 | 说明 |
|------|--------|------|
| BUGFIX | 0.9 | 修复过的代码 = 曾经有问题 |
| REFACTOR | 0.8 | 重构过的代码 = 复杂度较高 |
| FEATURE | 0.7 | 新功能 = 可能不稳定 |
| CONFIG | 0.5 | 配置变更 = 中等风险 |
| DOCS | 0.2 | 文档 = 低风险 |
| DELETE | 0.1 | 删除代码 = 极低风险 |
| UNKNOWN | 0.5 | 未知 = 默认中等风险 |

### 6.3 风险等级

- `high`: 综合分数 > 0.7
- `medium`: 综合分数 > 0.4
- `low`: 综合分数 ≤ 0.4

---

## 7. 模块依赖

```
Git 分析器 (git-analyzer.ts)
    │
    ├── 依赖: execFile (子进程)
    │
    ├── AI 饲料生成器 (ai-feed-generator.ts)
    │   ├── 依赖: FileHeaderScanner
    │   ├── 依赖: GitAnalyzer
    │   └── 输出: .codemap/ai-feed.txt
    │
    ├── Commit 验证器 (commit-validator.ts)
    │   └── 用于: Git Hook / CI
    │
    └── 被以下模块使用:
        └── AnalyzeCommand (analyze.ts)
        └── CI Gateway (ci-gateway.ts)
```

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Git 分析慢 | 大项目卡顿 | 限制提交数量 + 缓存 |
| git --follow 多文件问题 | 仅支持单文件 | 逐文件查询后合并 |
| 命令注入 | 安全漏洞 | 使用 execFile + 输入验证 |
| Commit 格式不兼容 | 迁移成本 | 提供 `codemap migrate` 命令批量转换 |
| 文件头注释遗漏 | CI 频繁失败 | `codemap generate --fix` 自动添加模板 |

---

## 9. 附录: AI 饲料示例

```text
# CODEMAP AI FEED
# Generated: 2026-02-28T19:30:00Z

FILE: src/orchestrator/git-analyzer.ts
GRAVITY: 15 | HEAT: 5/BUGFIX/2026-02-19
META: since=2024-03 stable=false why=分析Git历史，评估文件修改风险
IMPACT: 8 files depend on this
DEPS: src/types/index.ts, src/utils/exec.ts
---
FILE: src/utils/date.ts
GRAVITY: 0 | HEAT: 0/NEW/never
META: since=2023-06 stable=true why=日期工具函数，项目早期沉淀
IMPACT: 0 files depend on this
DEPS: none
---
```
