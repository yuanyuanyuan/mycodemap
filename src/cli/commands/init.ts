import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export async function initCommand(_options: { yes?: boolean }) {
  console.log(chalk.blue('🚀 初始化 CodeMap...'));

  const configPath = path.join(process.cwd(), 'codemap.config.json');

  // 检查是否已存在配置
  try {
    await fs.access(configPath);
    console.log(chalk.yellow('⚠️  配置文件已存在'));
    return;
  } catch {
    // 文件不存在，继续初始化
  }

  // 创建默认配置
  const defaultConfig = {
    $schema: 'https://codemap.dev/schema.json',
    mode: 'fast',
    include: ['src/**/*.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.test.ts',
      '*.spec.ts'
    ],
    output: '.codemap'
  };

  await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));

  console.log(chalk.green('✅ 初始化完成！'));
  console.log(chalk.gray('配置文件已创建: codemap.config.json'));
  console.log(chalk.gray('运行 "codemap generate" 生成代码地图'));
}
