// ============================================
// AI Provider 测试脚本
// ============================================

import { ClaudeProvider, CodexProvider, ProviderFactory, type AIProvider } from './src/ai/index.js';

/**
 * 测试 Provider 可用性
 */
async function testProvider(provider: AIProvider, name: string): Promise<void> {
  console.log(`\n🧪 测试 ${name} Provider...`);

  try {
    const isAvailable = await provider.isAvailable();
    if (isAvailable) {
      console.log(`  ✅ ${name} CLI 可用`);

      // 尝试简单执行
      try {
        const result = await provider.execute('Say "Hello" in one word', undefined);
        console.log(`  ✅ 执行测试成功: ${result.content.substring(0, 50)}...`);
      } catch (execError) {
        console.log(`  ⚠️  执行测试失败: ${execError instanceof Error ? execError.message : String(execError)}`);
      }
    } else {
      console.log(`  ❌ ${name} CLI 不可用`);
    }
  } catch (error) {
    console.log(`  ❌ 检查失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('='.repeat(50));
  console.log('🧪 AI Provider 测试');
  console.log('='.repeat(50));

  // 测试 ProviderFactory
  console.log('\n📦 测试 ProviderFactory...');

  // 测试检测功能
  const detected = await ProviderFactory.detectAvailable();
  if (detected) {
    console.log(`  ✅ 自动检测到可用 Provider: ${detected.type}`);
  } else {
    console.log('  ⚠️  未检测到可用的 CLI Provider');
  }

  // 测试各个 Provider
  await testProvider(new ClaudeProvider(), 'Claude');
  await testProvider(new CodexProvider(), 'Codex');

  // 测试工厂创建
  console.log('\n📦 测试工厂创建...');
  try {
    const claude = ProviderFactory.create('claude');
    console.log(`  ✅ Claude Provider 创建成功: ${claude.name}`);
  } catch (error) {
    console.log(`  ❌ 创建失败: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🧪 测试完成');
  console.log('='.repeat(50));
}

main().catch(console.error);
