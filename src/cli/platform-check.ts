// [META] since:2026-03-06 | owner:worker-2 | stable:true
// [WHY] 验证运行平台是否满足最低要求，避免运行时错误

import os from 'node:os';

export interface PlatformInfo {
  os: string;
  arch: string;
  nodeVersion: string;
  isSupported: boolean;
  supportLevel: 'full' | 'partial' | 'unsupported';
  warnings: string[];
}

/**
 * 检测当前平台是否被支持
 */
export function detectPlatform(): PlatformInfo {
  const platform = os.platform();
  const arch = os.arch();
  const nodeVersion = process.version;

  const warnings: string[] = [];
  let supportLevel: PlatformInfo['supportLevel'] = 'full';

  // 支持的平台列表
  const supportedPlatforms: Record<string, string[]> = {
    'darwin': ['x64', 'arm64'],
    'linux': ['x64', 'arm64'],
    'win32': ['x64', 'arm64'],
  };

  // 检查操作系统
  if (!(platform in supportedPlatforms)) {
    return {
      os: platform,
      arch,
      nodeVersion,
      isSupported: false,
      supportLevel: 'unsupported',
      warnings: [`不支持的操作系统: ${platform}`],
    };
  }

  // 检查架构
  const supportedArchs = supportedPlatforms[platform];
  if (!supportedArchs.includes(arch)) {
    warnings.push(`架构 ${arch} 可能不受官方支持`);
    supportLevel = 'partial';
  }

  // 检查 Node.js 版本
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion < 18) {
    return {
      os: platform,
      arch,
      nodeVersion,
      isSupported: false,
      supportLevel: 'unsupported',
      warnings: [`Node.js 版本过低: ${nodeVersion}，需要 >= 18.0.0`],
    };
  }

  if (majorVersion < 20) {
    warnings.push(`建议使用 Node.js 20+ 以获得最佳性能`);
    supportLevel = 'partial';
  }

  return {
    os: platform,
    arch,
    nodeVersion,
    isSupported: true,
    supportLevel,
    warnings,
  };
}

/**
 * 验证平台并在不支持时抛出错误
 */
export function validatePlatform(): PlatformInfo {
  const info = detectPlatform();

  if (!info.isSupported) {
    const errorMsg = [
      `❌ 平台不受支持`,
      `  操作系统: ${info.os}`,
      `  架构: ${info.arch}`,
      `  Node.js: ${info.nodeVersion}`,
      '',
      ...info.warnings,
      '',
      '请升级您的环境或联系支持团队。',
    ].join('\n');

    throw new Error(errorMsg);
  }

  return info;
}

/**
 * 获取平台诊断信息（用于调试）
 */
export function getPlatformDiagnostics(): Record<string, string> {
  const info = detectPlatform();
  return {
    os: info.os,
    arch: info.arch,
    nodeVersion: info.nodeVersion,
    supportLevel: info.supportLevel,
    isSupported: String(info.isSupported),
  };
}
