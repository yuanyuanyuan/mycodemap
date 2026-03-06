// [META] since:2026-03-06 | owner:cli-team | stable:false
// [WHY] 测试 report 命令的正确性

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock 模块
vi.mock('../paths.js', async () => {
  const mockLogDir = path.join(__dirname, '__fixtures__', 'logs');
  return {
    resolveOutputDir: vi.fn(() => ({
      outputDir: '.mycodemap',
      isLegacy: false,
    })),
    resolveDataPath: vi.fn(() => path.join(__dirname, '__fixtures__', 'codemap.json')),
    resolveLogDir: vi.fn(() => mockLogDir),
  };
});

describe('reportCommand', () => {
  beforeEach(() => {
    // 创建测试 fixtures
    const fixturesDir = path.join(__dirname, '__fixtures__');
    const logsDir = path.join(fixturesDir, 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // 创建模拟的 codemap.json
    const codemapData = {
      summary: {
        totalFiles: 100,
        totalModules: 20,
        totalExports: 500,
        totalLines: 10000,
      },
      modules: [],
    };
    fs.writeFileSync(
      path.join(fixturesDir, 'codemap.json'),
      JSON.stringify(codemapData)
    );

    // 创建模拟日志文件
    const logContent = `[2026-03-06T10:00:00.000Z] [INFO] Test message
[2026-03-06T10:01:00.000Z] [WARN] Warning message
[2026-03-06T10:02:00.000Z] [ERROR] Error message`;
    fs.writeFileSync(path.join(logsDir, 'test.log'), logContent);
  });

  afterEach(() => {
    // 清理测试 fixtures
    const fixturesDir = path.join(__dirname, '__fixtures__');
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('应正确解析命令行参数', async () => {
    const { reportCommand } = await import('../report.js');

    // 测试天数参数验证
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 模拟 process.exit
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // 测试无效天数
    await reportCommand({ days: '0' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('错误')
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('应生成报告文件', async () => {
    const { reportCommand } = await import('../report.js');

    const tempOutput = path.join(__dirname, '__temp_output__');

    await reportCommand({
      output: tempOutput,
      days: '7',
    });

    // 检查是否生成了报告文件
    const files = fs.readdirSync(tempOutput).filter(f => f.startsWith('mycodemap-report-'));

    expect(files.length).toBeGreaterThan(0);

    // 读取并验证报告内容
    const reportPath = path.join(tempOutput, files[0]);
    const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    expect(reportContent).toHaveProperty('generatedAt');
    expect(reportContent).toHaveProperty('period');
    expect(reportContent).toHaveProperty('summary');
    expect(reportContent).toHaveProperty('logs');
    expect(reportContent).toHaveProperty('modules');

    // 清理
    fs.rmSync(tempOutput, { recursive: true, force: true });
  });

  it('应包含正确的摘要信息', async () => {
    const { reportCommand } = await import('../report.js');

    const tempOutput = path.join(__dirname, '__temp_output2__');

    await reportCommand({
      output: tempOutput,
      days: '7',
    });

    const files = fs.readdirSync(tempOutput).filter(f => f.startsWith('mycodemap-report-'));
    const reportContent = JSON.parse(fs.readFileSync(path.join(tempOutput, files[0]), 'utf-8'));

    // 验证报告包含必要的字段
    expect(reportContent.summary).toHaveProperty('totalFiles');
    expect(reportContent.summary).toHaveProperty('totalModules');
    expect(reportContent.summary).toHaveProperty('totalExports');
    expect(reportContent.summary).toHaveProperty('totalLines');

    // 清理
    fs.rmSync(tempOutput, { recursive: true, force: true });
  });
});
