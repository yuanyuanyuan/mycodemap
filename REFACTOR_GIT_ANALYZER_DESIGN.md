# Git 分析器详细设计

> 版本: 2.3
> 所属模块: 编排层 - Git 分析器

---

## 1. 功能定位

在影响分析场景中，分析文件的修改历史，评估修改风险。

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
}
```

### 2.2 风险评分

```typescript
interface RiskScore {
  level: 'high' | 'medium' | 'low';
  frequency: number;           // 修改频率
  lastModified: Date | null;  // 最后修改时间
  contributors: string[];     // 贡献者
  riskFactors: string[];      // 风险因素
}
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

### 3.4 风险评分计算

```typescript
/**
 * 计算风险评分
 */
calculateRiskScore(
  targetFiles: string[],
  commits: CommitInfo[]
): RiskScore {
  // 1. 筛选与目标文件相关的提交
  const relevantCommits = commits.filter(c =>
    c.files.some(f => targetFiles.includes(f))
  );

  // 2. 计算修改频率分数
  // 近 30 天的修改次数越多，风险越高
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCommits = relevantCommits.filter(c => c.date > thirtyDaysAgo);
  const frequencyScore = Math.min(recentCommits.length / 10, 1);

  // 3. 统计贡献者数量
  const contributors = new Set(relevantCommits.map(c => c.author));
  const contributorScore = Math.min(contributors.size / 5, 1);

  // 4. 综合评分
  const totalScore = frequencyScore * 0.6 + contributorScore * 0.4;

  const riskFactors: string[] = [];
  if (frequencyScore > 0.7) riskFactors.push('高修改频率');
  if (contributors.size > 3) riskFactors.push('多贡献者维护');
  if (relevantCommits.length > 20) riskFactors.push('历史改动多');

  return {
    level: totalScore > 0.6 ? 'high' : totalScore > 0.3 ? 'medium' : 'low',
    frequency: recentCommits.length,
    lastModified: relevantCommits[0]?.date || null,
    contributors: Array.from(contributors),
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
        files: []
      };
    });
}
```

---

## 4. 风险评分策略

| 指标 | 计算方式 | 权重 |
|------|----------|------|
| **修改频率** | 30 天内修改次数 / 10 | 60% |
| **贡献者数量** | 贡献者数量 / 5 | 40% |

**风险等级**：
- `high`: 综合分数 > 0.6
- `medium`: 综合分数 > 0.3
- `low`: 综合分数 ≤ 0.3

---

## 5. 安全考虑

### 5.1 命令注入防护

使用 `execFile` 替代 `exec` 或 `spawn` shell 模式：

```typescript
// 正确用法 - 参数数组
await execFile('git', ['log', '--all', `--grep=${pattern}`]);

// 错误用法 - 字符串拼接（存在注入风险）
// await exec(`git log --all --grep=${pattern}`);
```

### 5.2 输入验证

- 关键词数量限制：最多 5 个
- 关键词长度限制：最多 100 字符
- 字符白名单：`^[a-zA-Z0-9_\-\.]+$`

---

## 6. 模块依赖

```
Git 分析器 (git-analyzer.ts)
    │
    ├── 依赖: execFile (子进程)
    │
    └── 被以下模块使用:
        └── AnalyzeCommand (analyze.ts)
```

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Git 分析慢 | 大项目卡顿 | 限制提交数量 + 缓存 |
| git --follow 多文件问题 | 仅支持单文件 | 逐文件查询后合并 |
| 命令注入 | 安全漏洞 | 使用 execFile + 输入验证 |
