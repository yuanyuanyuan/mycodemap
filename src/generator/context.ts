import fs from 'fs/promises';
import path from 'path';
import type { ModuleInfo, ModuleSymbol, MemberInfo, FunctionSignature, JSDocComment, CrossFileCall } from '../types/index.js';
import type { FileDescription } from './file-describer.js';

// 生成单个文件的 CONTEXT.md
export async function generateContext(
  module: ModuleInfo,
  rootDir: string,
  allModules: ModuleInfo[],
  aiDescription?: FileDescription
): Promise<string> {
  const lines: string[] = [];
  const relativePath = path.relative(rootDir, module.path);
  const moduleById = new Map(allModules.map(m => [m.id, m]));

  // 头部
  lines.push(`# ${relativePath}`);
  lines.push('');
  lines.push(`> 模块类型: ${module.type} | 代码行数: ${module.stats.codeLines}`);
  lines.push('');

  // 概述 - 优先使用 AI 生成的描述
  lines.push('## Overview');
  lines.push('');
  if (aiDescription) {
    lines.push(formatAIDescription(aiDescription));
  } else {
    lines.push(generateOverview(module));
  }
  lines.push('');

  // 导出
  if (module.exports.length > 0) {
    lines.push('## Exports');
    lines.push('');
    lines.push('| Name | Kind | Default | Type Only |');
    lines.push('|------|------|---------|-----------|');
    for (const exp of module.exports) {
      lines.push(`| \`${exp.name}\` | ${exp.kind} | ${exp.isDefault ? '✓' : '-'} | ${exp.isTypeOnly ? '✓' : '-'} |`);
    }
    lines.push('');
  }

  // 导入
  if (module.imports.length > 0) {
    lines.push('## Imports');
    lines.push('');
    for (const imp of module.imports) {
      lines.push(`- \`${imp.source}\` (${imp.sourceType})`);
      if (imp.specifiers.length > 0) {
        for (const spec of imp.specifiers) {
          lines.push(`  - ${spec.name}${spec.alias ? ` as ${spec.alias}` : ''}`);
        }
      }
    }
    lines.push('');
  }

  // 被哪些模块导入
  const importedBy = module.dependents
    .map(depId => moduleById.get(depId))
    .filter((m): m is ModuleInfo => Boolean(m && m.id !== module.id));

  if (importedBy.length > 0) {
    lines.push('## Imported By');
    lines.push('');
    for (const mod of importedBy) {
      lines.push(`- \`${path.relative(rootDir, mod.path)}\``);
    }
    lines.push('');
  }

  // 符号详情 - 增强版，包含签名
  if (module.symbols.length > 0) {
    lines.push('## Symbols');
    lines.push('');
    
    // 按类型分组
    const functions = module.symbols.filter(s => s.kind === 'function');
    const classes = module.symbols.filter(s => s.kind === 'class');
    const interfaces = module.symbols.filter(s => s.kind === 'interface');
    const types = module.symbols.filter(s => s.kind === 'type');
    const enums = module.symbols.filter(s => s.kind === 'enum');
    const variables = module.symbols.filter(s => s.kind === 'variable');
    const others = module.symbols.filter(s => 
      !['function', 'class', 'interface', 'type', 'enum', 'variable'].includes(s.kind)
    );

    // 函数
    if (functions.length > 0) {
      lines.push('### Functions');
      lines.push('');
      for (const fn of functions) {
        lines.push(formatFunctionSymbol(fn));
        lines.push('');
      }
    }

    // 类
    if (classes.length > 0) {
      lines.push('### Classes');
      lines.push('');
      for (const cls of classes) {
        lines.push(formatClassSymbol(cls));
        lines.push('');
      }
    }

    // 接口
    if (interfaces.length > 0) {
      lines.push('### Interfaces');
      lines.push('');
      for (const iface of interfaces) {
        lines.push(formatInterfaceSymbol(iface));
        lines.push('');
      }
    }

    // 类型别名
    if (types.length > 0) {
      lines.push('### Type Aliases');
      lines.push('');
      for (const type of types) {
        lines.push(formatTypeAliasSymbol(type));
        lines.push('');
      }
    }

    // 枚举
    if (enums.length > 0) {
      lines.push('### Enums');
      lines.push('');
      for (const enm of enums) {
        lines.push(formatEnumSymbol(enm));
        lines.push('');
      }
    }

    // 变量
    if (variables.length > 0) {
      lines.push('### Variables');
      lines.push('');
      for (const v of variables) {
        lines.push(formatVariableSymbol(v));
        lines.push('');
      }
    }

    // 其他
    if (others.length > 0) {
      lines.push('### Others');
      lines.push('');
      lines.push('| Name | Kind | Visibility | Location |');
      lines.push('|------|------|------------|----------|');
      for (const sym of others) {
        lines.push(`| \`${sym.name}\` | ${sym.kind} | ${sym.visibility} | L${sym.location.line} |`);
      }
      lines.push('');
    }
  }

  // 跨文件调用链
  if (module.callGraph?.crossFileCalls && module.callGraph.crossFileCalls.length > 0) {
    lines.push('## Cross-File Call Chain');
    lines.push('');
    
    const resolved = module.callGraph.crossFileCalls.filter(c => c.resolved);
    const unresolved = module.callGraph.crossFileCalls.filter(c => !c.resolved);
    
    if (resolved.length > 0) {
      lines.push(`### Resolved Calls (${resolved.length})`);
      lines.push('');
      lines.push('| Caller | Callee | Target File | Line |');
      lines.push('|--------|--------|-------------|------|');
      
      for (const call of resolved.slice(0, 10)) {
        const calleeShort = path.basename(call.calleeLocation.file);
        lines.push(`| L${call.callerLocation.line} | \`${call.callee}\` | \`${calleeShort}\` | L${call.calleeLocation.line} |`);
      }
      
      if (resolved.length > 10) {
        lines.push(`| ... | ... | ... | +${resolved.length - 10} more |`);
      }
      lines.push('');
    }
    
    if (unresolved.length > 0) {
      lines.push(`### External Calls (${unresolved.length})`);
      lines.push('');
      const unique = [...new Set(unresolved.map(c => c.callee))].slice(0, 10);
      for (const callee of unique) {
        lines.push(`- \`${callee}\``);
      }
      if (unresolved.length > 10) {
        lines.push(`- ... and ${unresolved.length - 10} more`);
      }
      lines.push('');
    }
  }

  // 统计信息
  lines.push('## Stats');
  lines.push('');
  lines.push(`- 总行数: ${module.stats.lines}`);
  lines.push(`- 代码行: ${module.stats.codeLines}`);
  lines.push(`- 注释行: ${module.stats.commentLines}`);
  lines.push(`- 空行: ${module.stats.blankLines}`);
  lines.push('');

  lines.push('---');
  lines.push('*Generated by CodeMap*');

  return lines.join('\n');
}

/**
 * 格式化 JSDoc 注释
 */
function formatJSDoc(jsdoc: JSDocComment | undefined, indent: string = ''): string {
  if (!jsdoc) return '';
  
  const lines: string[] = [];
  
  // 描述
  if (jsdoc.description) {
    lines.push(`${indent}> ${jsdoc.description.split('\n')[0]}`);
  }
  
  // 参数说明
  if (jsdoc.params.length > 0) {
    for (const param of jsdoc.params) {
      if (param.description) {
        lines.push(`${indent}> @param ${param.name} - ${param.description}`);
      }
    }
  }
  
  // 返回值说明
  if (jsdoc.returns?.description) {
    lines.push(`${indent}> @returns ${jsdoc.returns.description}`);
  }
  
  // 示例
  if (jsdoc.examples.length > 0) {
    lines.push(`${indent}> @example`);
    for (const example of jsdoc.examples.slice(0, 1)) {
      const exampleLines = example.split('\n').slice(0, 3);
      for (const line of exampleLines) {
        lines.push(`${indent}> \`\`\`${line.slice(0, 50)}${line.length > 50 ? '...' : ''}\`\`\``);
      }
    }
  }
  
  // 废弃标记
  if (jsdoc.deprecated) {
    lines.push(`${indent}> ⚠️ **Deprecated:** ${jsdoc.deprecated}`);
  }
  
  return lines.join('\n');
}

/**
 * 格式化函数符号
 */
function formatFunctionSymbol(fn: ModuleSymbol): string {
  const sig = fn.signature;
  const jsdocFormatted = formatJSDoc(fn.jsdoc, '  ');
  
  if (!sig) {
    let result = `- **${fn.name}** (function) - L${fn.location.line}`;
    if (jsdocFormatted) result += '\n' + jsdocFormatted;
    return result;
  }

  const asyncPrefix = sig.async ? 'async ' : '';
  const genericParams = sig.genericParams && sig.genericParams.length > 0 
    ? `<${sig.genericParams.join(', ')}>` 
    : '';
  const params = sig.parameters.map(p => {
    let paramStr = `${p.name}${p.optional ? '?' : ''}: ${p.type}`;
    if (p.defaultValue) paramStr += ` = ${p.defaultValue}`;
    return paramStr;
  }).join(', ');

  let result = `- **${fn.name}**${genericParams}(${params}): ${sig.returnType} - L${fn.location.line}`;
  
  if (jsdocFormatted) {
    result += '\n' + jsdocFormatted;
  }
  
  // 添加调用关系
  if (sig.calls && sig.calls.length > 0) {
    const uniqueCalls = [...new Set(sig.calls.map(c => c.callee))].slice(0, 5);
    result += `\n  - Calls: ${uniqueCalls.join(', ')}${sig.calls.length > 5 ? ` (+${sig.calls.length - 5} more)` : ''}`;
  }
  
  // 添加代码片段（关键代码结构）
  if (sig.bodySnippets && sig.bodySnippets.length > 0) {
    result += '\n  <details>\n  <summary>📝 Code Structure</summary>\n';
    for (const snippet of sig.bodySnippets.slice(0, 5)) {
      result += `\n  \`\`\`typescript\n  // L${snippet.lineStart}-${snippet.lineEnd} ${snippet.description || snippet.type}\n  ${snippet.lines}\n  \`\`\``;
    }
    if (sig.bodySnippets.length > 5) {
      result += `\n  // ... and ${sig.bodySnippets.length - 5} more structures`;
    }
    result += '\n  </details>';
  }
  
  return result;
}

/**
 * 格式化类符号
 */
function formatClassSymbol(cls: ModuleSymbol): string {
  let result = `- **${cls.name}** (class)`;
  if (cls.extends && cls.extends.length > 0) {
    result += ` extends ${cls.extends.join(', ')}`;
  }
  if (cls.implements && cls.implements.length > 0) {
    result += ` implements ${cls.implements.join(', ')}`;
  }
  result += ` - L${cls.location.line}`;

  const jsdocFormatted = formatJSDoc(cls.jsdoc, '  ');
  if (jsdocFormatted) {
    result += '\n' + jsdocFormatted;
  }

  if (cls.members && cls.members.length > 0) {
    result += '\n' + formatMembers(cls.members, '  ');
  }

  return result;
}

/**
 * 格式化接口符号
 */
function formatInterfaceSymbol(iface: ModuleSymbol): string {
  let result = `- **${iface.name}** (interface)`;
  if (iface.extends && iface.extends.length > 0) {
    result += ` extends ${iface.extends.join(', ')}`;
  }
  result += ` - L${iface.location.line}`;

  const jsdocFormatted = formatJSDoc(iface.jsdoc, '  ');
  if (jsdocFormatted) {
    result += '\n' + jsdocFormatted;
  }

  if (iface.members && iface.members.length > 0) {
    result += '\n' + formatMembers(iface.members, '  ');
  }

  return result;
}

/**
 * 格式化类型别名符号
 */
function formatTypeAliasSymbol(type: ModuleSymbol): string {
  const typeStr = type.type || 'any';
  let result = `- **${type.name}** = \`${typeStr}\` - L${type.location.line}`;
  
  const jsdocFormatted = formatJSDoc(type.jsdoc, '  ');
  if (jsdocFormatted) {
    result += '\n' + jsdocFormatted;
  }
  
  return result;
}

/**
 * 格式化枚举符号
 */
function formatEnumSymbol(enm: ModuleSymbol): string {
  let result = `- **${enm.name}** (enum) - L${enm.location.line}`;
  
  const jsdocFormatted = formatJSDoc(enm.jsdoc, '  ');
  if (jsdocFormatted) {
    result += '\n' + jsdocFormatted;
  }
  
  if (enm.members && enm.members.length > 0) {
    result += '\n  - Members: ' + enm.members.map(m => m.name).join(', ');
  }
  return result;
}

/**
 * 格式化变量符号
 */
function formatVariableSymbol(v: ModuleSymbol): string {
  const typeStr = v.type || 'any';
  let result = `- **${v.name}**: ${typeStr} - L${v.location.line}`;
  
  const jsdocFormatted = formatJSDoc(v.jsdoc, '  ');
  if (jsdocFormatted) {
    result += '\n' + jsdocFormatted;
  }
  
  return result;
}

/**
 * 格式化成员列表
 */
function formatMembers(members: MemberInfo[], indent: string): string {
  const lines: string[] = [];

  // 分组：属性、方法
  const properties = members.filter(m => m.kind === 'property');
  const methods = members.filter(m => m.kind === 'method');
  const getters = members.filter(m => m.kind === 'getter');
  const setters = members.filter(m => m.kind === 'setter');

  if (properties.length > 0) {
    lines.push(`${indent}Properties:`);
    for (const prop of properties) {
      const modifiers = [
        prop.visibility,
        prop.static ? 'static' : '',
        prop.readonly ? 'readonly' : '',
        prop.abstract ? 'abstract' : ''
      ].filter(Boolean).join(' ');
      const optional = prop.optional ? '?' : '';
      lines.push(`${indent}  - ${modifiers} ${prop.name}${optional}: ${prop.type}`);
    }
  }

  if (methods.length > 0) {
    lines.push(`${indent}Methods:`);
    for (const method of methods) {
      const modifiers = [
        method.visibility,
        method.static ? 'static' : '',
        method.abstract ? 'abstract' : ''
      ].filter(Boolean).join(' ');
      const optional = method.optional ? '?' : '';

      if (method.signature) {
        const params = method.signature.parameters.map(p => {
          let pstr = `${p.name}${p.optional ? '?' : ''}: ${p.type}`;
          if (p.defaultValue) pstr += ` = ${p.defaultValue}`;
          return pstr;
        }).join(', ');
        let methodStr = `${indent}  - ${modifiers} ${method.name}${optional}(${params}): ${method.signature.returnType}`;
        
        // 添加方法调用关系
        if (method.signature.calls && method.signature.calls.length > 0) {
          const uniqueCalls = [...new Set(method.signature.calls.map(c => c.callee))].slice(0, 3);
          methodStr += ` [calls: ${uniqueCalls.join(', ')}${method.signature.calls.length > 3 ? '...' : ''}]`;
        }
        
        lines.push(methodStr);
      } else {
        lines.push(`${indent}  - ${modifiers} ${method.name}${optional}: ${method.type}`);
      }
    }
  }

  if (getters.length > 0) {
    lines.push(`${indent}Getters:`);
    for (const getter of getters) {
      const modifiers = [getter.visibility, getter.static ? 'static' : ''].filter(Boolean).join(' ');
      lines.push(`${indent}  - ${modifiers} get ${getter.name}(): ${getter.type}`);
    }
  }

  if (setters.length > 0) {
    lines.push(`${indent}Setters:`);
    for (const setter of setters) {
      const modifiers = [setter.visibility, setter.static ? 'static' : ''].filter(Boolean).join(' ');
      lines.push(`${indent}  - ${modifiers} set ${setter.name}(value: ${setter.type})`);
    }
  }

  return lines.join('\n');
}

/**
 * 格式化 AI 生成的描述
 */
function formatAIDescription(desc: FileDescription): string {
  const lines: string[] = [];
  
  // 核心描述
  if (desc.description) {
    lines.push(`**📋 描述**: ${desc.description}`);
    lines.push('');
  }
  
  // 用途
  if (desc.purpose) {
    lines.push(`**🎯 核心职责**: ${desc.purpose}`);
    lines.push('');
  }
  
  // 关键功能
  if (desc.keyFeatures && desc.keyFeatures.length > 0) {
    lines.push('**✨ 关键功能**:');
    for (const feature of desc.keyFeatures) {
      lines.push(`- ${feature}`);
    }
    lines.push('');
  }
  
  // 依赖关系
  if (desc.dependenciesSummary) {
    lines.push(`**🔗 依赖关系**: ${desc.dependenciesSummary}`);
  }
  
  // 生成时间（可选显示）
  if (desc.generatedAt) {
    const date = new Date(desc.generatedAt);
    lines.push('');
    lines.push(`<sub>🤖 AI 生成于 ${date.toLocaleString('zh-CN')}</sub>`);
  }
  
  return lines.join('\n');
}

// 生成文件概述
function generateOverview(module: ModuleInfo): string {
  const parts: string[] = [];

  // 文件类型
  if (module.type === 'source') {
    parts.push('源代码模块');
  } else if (module.type === 'test') {
    parts.push('测试文件');
  } else if (module.type === 'config') {
    parts.push('配置文件');
  }

  // 导出数量
  if (module.exports.length > 0) {
    parts.push(`导出 ${module.exports.length} 个符号`);
  }

  // 导入数量
  if (module.imports.length > 0) {
    parts.push(`导入 ${module.imports.length} 个模块`);
  }

  return parts.join('，') || '空模块';
}

// 生成所有文件的 CONTEXT.md
export async function generateAllContexts(
  modules: ModuleInfo[],
  rootDir: string,
  outputDir: string,
  aiDescriptions?: Map<string, FileDescription>
): Promise<void> {
  const contextDir = path.join(outputDir, 'context');
  await fs.mkdir(contextDir, { recursive: true });

  for (const module of modules) {
    const relativePath = path.relative(rootDir, module.path);
    const contextPath = path.join(contextDir, relativePath.replace('.ts', '.md'));

    // 确保目录存在
    await fs.mkdir(path.dirname(contextPath), { recursive: true });

    // 获取 AI 描述
    const aiDescription = aiDescriptions?.get(relativePath);

    // 生成内容
    const content = await generateContext(module, rootDir, modules, aiDescription);
    await fs.writeFile(contextPath, content);
  }

  // 生成索引文件
  await generateContextIndex(modules, rootDir, contextDir);

  // 兼容旧文档，提供根目录入口文件
  await generateRootContextFile(outputDir);
}

// 生成 CONTEXT 索引
async function generateContextIndex(
  modules: ModuleInfo[],
  rootDir: string,
  contextDir: string
): Promise<void> {
  const lines: string[] = [];
  lines.push('# CONTEXT Index');
  lines.push('');
  lines.push('> 每个文件的详细路标');
  lines.push('');
  lines.push('## Files');
  lines.push('');

  for (const module of modules) {
    const relativePath = path.relative(rootDir, module.path);
    lines.push(`- [${relativePath}](./${relativePath.replace('.ts', '.md')})`);
  }

  await fs.writeFile(path.join(contextDir, 'README.md'), lines.join('\n'));
}

async function generateRootContextFile(outputDir: string): Promise<void> {
  const lines = [
    '# CONTEXT',
    '',
    '> 模块上下文索引入口',
    '',
    '- [查看完整索引](./context/README.md)'
  ];

  await fs.writeFile(path.join(outputDir, 'CONTEXT.md'), lines.join('\n'));
}
