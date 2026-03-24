// [META] since:2026-03 | owner:cli-team | stable:true
// [WHY] Initialize CodeMap configuration for new projects

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { createDefaultCodemapConfigFile } from '../config-loader.js';

const NEW_CONFIG_NAME = 'mycodemap.config.json';
const LEGACY_CONFIG_NAME = 'codemap.config.json';

export async function initCommand(_options: { yes?: boolean }) {
  console.log(chalk.blue('🚀 初始化 CodeMap...'));

  const newConfigPath = path.join(process.cwd(), NEW_CONFIG_NAME);
  const legacyConfigPath = path.join(process.cwd(), LEGACY_CONFIG_NAME);

  // 优先检查新配置
  try {
    await fs.access(newConfigPath);
    console.log(chalk.yellow(`⚠️  配置文件已存在 (${NEW_CONFIG_NAME})`));
    return;
  } catch {
    // 新配置不存在，继续
  }

  // 兼容旧配置：如果存在旧配置，迁移到新配置
  try {
    await fs.access(legacyConfigPath);
    console.log(chalk.yellow(`⚠️  发现旧配置文件 ${LEGACY_CONFIG_NAME}，已迁移到 ${NEW_CONFIG_NAME}`));
    const legacyContent = await fs.readFile(legacyConfigPath, 'utf-8');
    await fs.writeFile(newConfigPath, legacyContent);
    console.log(chalk.green(`✅ 迁移完成！配置文件: ${NEW_CONFIG_NAME}`));
    return;
  } catch {
    // 旧配置也不存在，创建新配置
  }

  // 创建默认配置
  const defaultConfig = createDefaultCodemapConfigFile();

  await fs.writeFile(newConfigPath, JSON.stringify(defaultConfig, null, 2));

  console.log(chalk.green('✅ 初始化完成！'));
  console.log(chalk.gray(`配置文件已创建: ${NEW_CONFIG_NAME}`));
  console.log(chalk.gray('运行 "mycodemap generate" 或 "codemap generate" 生成代码地图'));
}
