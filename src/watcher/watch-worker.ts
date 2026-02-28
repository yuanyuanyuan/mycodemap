// ============================================
// Watcher Worker - 后台工作进程
// ============================================

import { analyze } from '../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext } from '../generator/index.js';
import type { AnalysisOptions } from '../types/index.js';

/**
 * Worker 配置
 */
interface WorkerConfig {
  rootDir: string;
  outputDir: string;
  mode: 'fast' | 'smart';
}

/**
 * Worker 消息
 */
interface WorkerMessage {
  type: 'config' | 'trigger';
  payload?: any;
}

let config: WorkerConfig | null = null;

/**
 * 运行分析
 */
async function runAnalysis(): Promise<void> {
  if (!config) {
    console.error('[Worker] 配置未初始化');
    return;
  }

  console.log('[Worker] 开始分析...');

  try {
    const analysisOptions: AnalysisOptions = {
      mode: config.mode,
      rootDir: config.rootDir,
      output: config.outputDir
    };

    const codeMap = await analyze(analysisOptions);
    await generateAIMap(codeMap, config.outputDir);
    await generateJSON(codeMap, config.outputDir);
    await generateContext(codeMap, config.outputDir);

    console.log(`[Worker] 分析完成: ${codeMap.summary.totalFiles} 个文件`);
  } catch (error) {
    console.error('[Worker] 分析失败:', error);
  }
}

// 监听进程消息
process.on('message', async (message: WorkerMessage) => {
  switch (message.type) {
    case 'config':
      config = message.payload;
      console.log('[Worker] 配置已接收:', config);
      // 初始分析
      await runAnalysis();
      break;

    case 'trigger':
      console.log('[Worker] 收到触发消息');
      await runAnalysis();
      break;
  }
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('[Worker] 收到 SIGTERM，正在退出...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] 收到 SIGINT，正在退出...');
  process.exit(0);
});

console.log('[Worker] 工作进程已启动，PID:', process.pid);
