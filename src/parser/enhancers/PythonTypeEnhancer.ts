// [META] since:2026-05 | owner:parser-team | stable:false
// [WHY] Python post-parse type enhancement fills top-level typeInfo from explicit annotations and bounded docstring facts

import { readFile } from 'node:fs/promises';
import type { MemberInfo, ModuleSymbol, ParameterInfo } from '../../interface/types/index.js';
import type { ParseResult } from '../../interface/types/parser.js';
import type { TypeInfo } from '../interfaces/IParser.js';

const PYTHON_EXTENSIONS = new Set(['.py']);
const DOCSTRING_START = /^([rubf]+)?("""|''')/i;
const DOCSTRING_BOUNDARY = /^(Args|Returns|Attributes)\s*:\s*$/;
const NUMPY_BOUNDARY = /^(Parameters|Returns|Attributes)\s*$/;

interface FunctionDocstringInfo {
  parameters: Map<string, string>;
  returnType?: string;
}

interface ClassDocstringInfo {
  attributes: Map<string, string>;
}

interface DocstringInventory {
  functions: Map<string, FunctionDocstringInfo>;
  classes: Map<string, ClassDocstringInfo>;
}

export class PythonTypeEnhancer {
  constructor(private readonly enabled: boolean = true) {}

  async enhance(results: ParseResult[]): Promise<ParseResult[]> {
    if (!this.enabled) {
      return results;
    }

    const enhancedResults: ParseResult[] = [];
    for (const result of results) {
      enhancedResults.push(await this.enhanceResult(result));
    }

    return enhancedResults;
  }

  dispose(): void {}

  private async enhanceResult(result: ParseResult): Promise<ParseResult> {
    if (!this.isPythonFile(result.filePath)) {
      return result;
    }

    const content = await this.readSource(result.filePath);
    if (!content) {
      return {
        ...result,
        typeInfo: this.ensureTypeInfo(result.typeInfo),
      };
    }

    const docs = this.extractDocstrings(content);
    const symbols = result.symbols.map((symbol) => this.enhanceSymbol(symbol, docs));

    return {
      ...result,
      symbols,
      typeInfo: this.buildTypeInfo(result.typeInfo, symbols),
    };
  }

  private async readSource(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private enhanceSymbol(symbol: ModuleSymbol, docs: DocstringInventory): ModuleSymbol {
    if (symbol.kind === 'function' && symbol.signature) {
      const doc = docs.functions.get(symbol.name);
      if (!doc) {
        return symbol;
      }

      const parameters = this.mergeParameters(symbol.signature.parameters, doc.parameters);
      const returnType = symbol.signature.returnType || doc.returnType || '';

      return {
        ...symbol,
        signature: {
          ...symbol.signature,
          parameters,
          returnType,
        },
      };
    }

    if (symbol.kind === 'class') {
      const doc = docs.classes.get(symbol.name);
      if (!doc) {
        return symbol;
      }

      return {
        ...symbol,
        members: this.mergeMembers(symbol.members, doc.attributes),
      };
    }

    return symbol;
  }

  private mergeParameters(parameters: ParameterInfo[], docTypes: Map<string, string>): ParameterInfo[] {
    return parameters.map((parameter) => {
      if (parameter.type) {
        return parameter;
      }

      const docType = docTypes.get(parameter.name);
      if (!docType) {
        return parameter;
      }

      return {
        ...parameter,
        type: docType,
      };
    });
  }

  private mergeMembers(
    existingMembers: MemberInfo[] | undefined,
    attributeTypes: Map<string, string>
  ): MemberInfo[] {
    const members = [...(existingMembers ?? [])];
    const memberIndex = new Map(members.map((member, index) => [member.name, index]));

    for (const [name, type] of attributeTypes.entries()) {
      const existingIndex = memberIndex.get(name);
      if (existingIndex === undefined) {
        members.push({
          name,
          kind: 'property',
          type,
          visibility: 'public',
          optional: false,
        });
        continue;
      }

      const existing = members[existingIndex];
      if (existing && !existing.type) {
        members[existingIndex] = {
          ...existing,
          type,
        };
      }
    }

    return members;
  }

  private buildTypeInfo(existing: TypeInfo | undefined, symbols: ModuleSymbol[]): TypeInfo {
    const typeInfo = this.ensureTypeInfo(existing);
    const typeDefinitions = [...typeInfo.typeDefinitions];
    const unionTypes = new Set(typeInfo.unionTypes);
    const intersectionTypes = new Set(typeInfo.intersectionTypes);
    const definitionIndex = new Map(
      typeDefinitions.map((definition, index) => [`${definition.kind}:${definition.name}`, index])
    );

    for (const symbol of symbols) {
      if (symbol.kind === 'function' && symbol.signature) {
        const members = [
          ...symbol.signature.parameters
            .filter((parameter) => parameter.type)
            .map((parameter) => ({
              name: parameter.name,
              type: parameter.type,
              optional: parameter.optional,
            })),
          ...(symbol.signature.returnType
            ? [{
                name: 'return',
                type: symbol.signature.returnType,
                optional: false,
              }]
            : []),
        ];

        if (members.length > 0) {
          this.upsertDefinition(definitionIndex, typeDefinitions, {
            name: symbol.name,
            kind: 'type',
            members,
          });
        }

        for (const member of members) {
          this.collectComplexTypes(member.type, unionTypes, intersectionTypes);
        }
      }

      if (symbol.kind === 'class' && symbol.members?.length) {
        const members = symbol.members
          .filter((member) => member.type)
          .map((member) => ({
            name: member.name,
            type: member.type,
            optional: member.optional,
          }));

        if (members.length > 0) {
          this.upsertDefinition(definitionIndex, typeDefinitions, {
            name: symbol.name,
            kind: 'class',
            members,
          });
        }

        for (const member of members) {
          this.collectComplexTypes(member.type, unionTypes, intersectionTypes);
        }
      }
    }

    return {
      ...typeInfo,
      typeDefinitions,
      unionTypes: [...unionTypes],
      intersectionTypes: [...intersectionTypes],
    };
  }

  private upsertDefinition(
    definitionIndex: Map<string, number>,
    typeDefinitions: TypeInfo['typeDefinitions'],
    nextDefinition: TypeInfo['typeDefinitions'][number]
  ): void {
    const key = `${nextDefinition.kind}:${nextDefinition.name}`;
    const existingIndex = definitionIndex.get(key);
    if (existingIndex === undefined) {
      definitionIndex.set(key, typeDefinitions.length);
      typeDefinitions.push(nextDefinition);
      return;
    }

    typeDefinitions[existingIndex] = nextDefinition;
  }

  private collectComplexTypes(
    type: string,
    unionTypes: Set<string>,
    intersectionTypes: Set<string>
  ): void {
    if (type.includes('|') || /^Optional\[[^\]]+\]$/.test(type)) {
      unionTypes.add(type);
    }

    if (type.includes('&')) {
      intersectionTypes.add(type);
    }
  }

  private ensureTypeInfo(typeInfo?: TypeInfo): TypeInfo {
    return {
      typeDefinitions: typeInfo?.typeDefinitions ?? [],
      genericParams: typeInfo?.genericParams ?? [],
      crossFileRefs: typeInfo?.crossFileRefs ?? [],
      unionTypes: typeInfo?.unionTypes ?? [],
      intersectionTypes: typeInfo?.intersectionTypes ?? [],
      typeAliases: typeInfo?.typeAliases ?? [],
      conditionalTypes: typeInfo?.conditionalTypes ?? [],
      mappedTypes: typeInfo?.mappedTypes ?? [],
      templateLiteralTypes: typeInfo?.templateLiteralTypes ?? [],
      indexedAccessTypes: typeInfo?.indexedAccessTypes ?? [],
      inferredTypes: typeInfo?.inferredTypes ?? [],
    };
  }

  private extractDocstrings(content: string): DocstringInventory {
    const inventory: DocstringInventory = {
      functions: new Map(),
      classes: new Map(),
    };

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line) {
        continue;
      }

      const match = line.match(/^(\s*)(?:async\s+def|def|class)\s+([A-Za-z_][\w]*)\b.*:\s*$/);
      if (!match) {
        continue;
      }

      const indent = match[1]?.length ?? 0;
      const name = match[2];
      const docstring = this.readImmediateDocstring(lines, index + 1, indent);
      if (!docstring || !name) {
        continue;
      }

      const parsed = this.parseDocstring(docstring);
      if (line.trimStart().startsWith('class ')) {
        inventory.classes.set(name, parsed.classInfo);
      } else {
        inventory.functions.set(name, parsed.functionInfo);
      }
    }

    return inventory;
  }

  private readImmediateDocstring(
    lines: string[],
    startIndex: number,
    parentIndent: number
  ): string | null {
    let index = startIndex;
    while (index < lines.length && lines[index]?.trim() === '') {
      index++;
    }

    const candidate = lines[index];
    if (!candidate) {
      return null;
    }

    const indent = this.getIndent(candidate);
    if (indent <= parentIndent) {
      return null;
    }

    const trimmed = candidate.trimStart();
    const delimiterMatch = trimmed.match(DOCSTRING_START);
    if (!delimiterMatch) {
      return null;
    }

    const delimiter = delimiterMatch[2];
    const remainder = trimmed.slice(delimiterMatch[0].length);
    const bodyLines: string[] = [];

    if (remainder.includes(delimiter)) {
      bodyLines.push(remainder.slice(0, remainder.indexOf(delimiter)));
      return this.normalizeDocstring(bodyLines);
    }

    if (remainder.length > 0) {
      bodyLines.push(remainder);
    }

    for (let lineIndex = index + 1; lineIndex < lines.length; lineIndex++) {
      const current = lines[lineIndex] ?? '';
      const closingIndex = current.indexOf(delimiter);
      if (closingIndex >= 0) {
        bodyLines.push(current.slice(0, closingIndex));
        return this.normalizeDocstring(bodyLines);
      }
      bodyLines.push(current);
    }

    return this.normalizeDocstring(bodyLines);
  }

  private normalizeDocstring(lines: string[]): string {
    const trimmedLines = [...lines];
    while (trimmedLines.length > 0 && trimmedLines[0]?.trim() === '') {
      trimmedLines.shift();
    }
    while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1]?.trim() === '') {
      trimmedLines.pop();
    }

    const indents = trimmedLines
      .filter((line) => line.trim().length > 0)
      .map((line) => this.getIndent(line));
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

    return trimmedLines
      .map((line) => line.slice(Math.min(this.getIndent(line), minIndent)))
      .join('\n');
  }

  private parseDocstring(docstring: string): {
    functionInfo: FunctionDocstringInfo;
    classInfo: ClassDocstringInfo;
  } {
    const functionInfo: FunctionDocstringInfo = {
      parameters: new Map(),
    };
    const classInfo: ClassDocstringInfo = {
      attributes: new Map(),
    };

    const lines = docstring.split('\n');
    this.parseGoogleSections(lines, functionInfo, classInfo);
    this.parseNumpySections(lines, functionInfo, classInfo);
    this.parseSphinxFields(lines, functionInfo, classInfo);

    return { functionInfo, classInfo };
  }

  private parseGoogleSections(
    lines: string[],
    functionInfo: FunctionDocstringInfo,
    classInfo: ClassDocstringInfo
  ): void {
    for (let index = 0; index < lines.length; index++) {
      const header = lines[index]?.trim();
      if (header !== 'Args:' && header !== 'Returns:' && header !== 'Attributes:') {
        continue;
      }

      const startIndent = this.getIndent(lines[index] ?? '');
      for (let lineIndex = index + 1; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex] ?? '';
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        if (DOCSTRING_BOUNDARY.test(trimmed) || NUMPY_BOUNDARY.test(trimmed)) {
          break;
        }

        if (this.getIndent(line) <= startIndent) {
          break;
        }

        if (header === 'Returns:') {
          const match = trimmed.match(/^([^:]+):\s+/);
          if (match && !functionInfo.returnType) {
            functionInfo.returnType = match[1]?.trim();
          }
          continue;
        }

        const match = trimmed.match(/^([A-Za-z_][\w]*)\s*\(([^)]+)\):\s+/);
        if (!match) {
          continue;
        }

        const name = match[1];
        const type = match[2]?.trim();
        if (!name || !type) {
          continue;
        }

        if (header === 'Args:') {
          functionInfo.parameters.set(name, type);
        } else {
          classInfo.attributes.set(name, type);
        }
      }
    }
  }

  private parseNumpySections(
    lines: string[],
    functionInfo: FunctionDocstringInfo,
    classInfo: ClassDocstringInfo
  ): void {
    for (let index = 0; index < lines.length; index++) {
      const header = lines[index]?.trim();
      if (header !== 'Parameters' && header !== 'Returns' && header !== 'Attributes') {
        continue;
      }

      if (!/^[-=]{3,}\s*$/.test(lines[index + 1]?.trim() ?? '')) {
        continue;
      }

      for (let lineIndex = index + 2; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex] ?? '';
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        if (NUMPY_BOUNDARY.test(trimmed) && /^[-=]{3,}\s*$/.test(lines[lineIndex + 1]?.trim() ?? '')) {
          break;
        }

        if (header === 'Returns') {
          if (!/^[A-Za-z_][\w]*\s*:/.test(trimmed)) {
            if (!functionInfo.returnType) {
              functionInfo.returnType = trimmed;
            }
            continue;
          }
        }

        const match = trimmed.match(/^([A-Za-z_][\w]*)\s*:\s*(.+)$/);
        if (!match) {
          continue;
        }

        const name = match[1];
        const type = match[2]?.trim();
        if (!name || !type) {
          continue;
        }

        if (header === 'Parameters') {
          functionInfo.parameters.set(name, type);
        } else if (header === 'Attributes') {
          classInfo.attributes.set(name, type);
        }
      }
    }
  }

  private parseSphinxFields(
    lines: string[],
    functionInfo: FunctionDocstringInfo,
    classInfo: ClassDocstringInfo
  ): void {
    for (const line of lines) {
      const trimmed = line.trim();

      const typeMatch = trimmed.match(/^:type\s+([A-Za-z_][\w]*):\s+(.+)$/);
      if (typeMatch) {
        const name = typeMatch[1];
        const type = typeMatch[2]?.trim();
        if (name && type) {
          functionInfo.parameters.set(name, type);
        }
      }

      const returnMatch = trimmed.match(/^:rtype:\s+(.+)$/);
      if (returnMatch && !functionInfo.returnType) {
        functionInfo.returnType = returnMatch[1]?.trim();
      }

      const attrTypeMatch = trimmed.match(/^:vartype\s+([A-Za-z_][\w]*):\s+(.+)$/);
      if (attrTypeMatch) {
        const name = attrTypeMatch[1];
        const type = attrTypeMatch[2]?.trim();
        if (name && type) {
          classInfo.attributes.set(name, type);
        }
      }
    }
  }

  private getIndent(line: string): number {
    return line.match(/^\s*/)?.[0].length ?? 0;
  }

  private isPythonFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    for (const extension of PYTHON_EXTENSIONS) {
      if (lower.endsWith(extension)) {
        return true;
      }
    }
    return false;
  }
}
