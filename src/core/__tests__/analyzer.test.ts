import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAnalysisContext } from "../../composition/parser-composition.js";
import { analyze } from "../analyzer.js";
import { TreeSitterParser } from "../../infrastructure/parser/implementations/TreeSitterParser.js";

const tempDirs: string[] = [];

async function createTempProject(): Promise<string> {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "codemap-analyzer-"));
  tempDirs.push(rootDir);

  await fs.mkdir(path.join(rootDir, "src"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "src", "a.ts"),
    [
      "import { foo } from './b';",
      "import { bar } from './b';",
      "",
      "export const run = () => foo() + bar();",
    ].join("\n"),
    "utf-8",
  );

  await fs.writeFile(
    path.join(rootDir, "src", "b.ts"),
    [
      "export const foo = () => 1;",
      "export const bar = () => 2;",
    ].join("\n"),
    "utf-8",
  );

  return rootDir;
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function copyFixture(rootDir: string, fixtureName: string, targetName = fixtureName): Promise<void> {
  const fixturePath = path.resolve(import.meta.dirname, `../../../tests/fixtures/python/${fixtureName}`);
  const content = await fs.readFile(fixturePath, 'utf-8');
  await fs.writeFile(path.join(rootDir, 'src', targetName), content, 'utf-8');
}

function withAnalysisContext<T extends { rootDir: string; enhanceTypes?: boolean }>(options: T): T & ReturnType<typeof buildAnalysisContext> {
  return {
    ...options,
    ...buildAnalysisContext(options.rootDir, options.enhanceTypes ?? true),
  };
}

describe("analyze", () => {
  it("fills dependents and deduplicates dependency edges", async () => {
    const rootDir = await createTempProject();

    const codeMap = await analyze(withAnalysisContext({
      rootDir,
      mode: "tree-sitter",
      include: ["src/**/*.ts"],
    }));

    const moduleA = codeMap.modules.find((m) => m.path.endsWith("/src/a.ts"));
    const moduleB = codeMap.modules.find((m) => m.path.endsWith("/src/b.ts"));

    expect(moduleA).toBeDefined();
    expect(moduleB).toBeDefined();

    const edgesToB = codeMap.dependencies.edges.filter(
      (edge) => edge.from === moduleA!.id && edge.to === moduleB!.id,
    );

    expect(edgesToB).toHaveLength(1);
    expect(moduleB!.dependents).toContain(moduleA!.id);
    expect(moduleB!.dependents.filter((id) => id === moduleA!.id)).toHaveLength(1);
  });

  it("generates stable non-colliding ids for common filenames", async () => {
    const rootDir = await createTempProject();
    await fs.mkdir(path.join(rootDir, "src", "nested"), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "src", "index.ts"),
      "export const a = 1;",
      "utf-8",
    );
    await fs.writeFile(
      path.join(rootDir, "src", "nested", "index.ts"),
      "export const b = 2;",
      "utf-8",
    );

    const codeMap = await analyze(withAnalysisContext({
      rootDir,
      mode: "tree-sitter",
      include: ["src/**/*.ts"],
    }));

    const ids = new Set(codeMap.modules.map((m) => m.id));
    expect(ids.size).toBe(codeMap.modules.length);
  });

  it("resolves registry-backed relative dependencies to local modules", async () => {
    const rootDir = await createTempProject();

    const codeMap = await analyze(withAnalysisContext({
      rootDir,
      mode: "tree-sitter",
      include: ["src/**/*.ts"],
    }));

    const moduleA = codeMap.modules.find((m) => m.path.endsWith("/src/a.ts"));
    const moduleB = codeMap.modules.find((m) => m.path.endsWith("/src/b.ts"));
    expect(moduleA).toBeDefined();
    expect(moduleB).toBeDefined();

    const edgesToB = codeMap.dependencies.edges.filter(
      (edge) => edge.from === moduleA!.id && edge.to === moduleB!.id,
    );
    expect(edgesToB).toHaveLength(1);
    expect(moduleB!.dependents).toContain(moduleA!.id);
  });

  it("marks graph as partial when the registry-backed parser skips a discovered file", async () => {
    const rootDir = await createTempProject();
    const originalParseContent = TreeSitterParser.prototype.parseContent;
    const parseContentSpy = vi.spyOn(TreeSitterParser.prototype, "parseContent").mockImplementation(
      async function (filePath: string, content: string) {
        if (filePath.endsWith("/src/b.ts")) {
          throw new Error("simulated parse skip");
        }
        return originalParseContent.call(this, filePath, content);
      },
    );

    const codeMap = await analyze(withAnalysisContext({
      rootDir,
      mode: "tree-sitter",
      include: ["src/**/*.ts"],
    }));

    expect(codeMap.graphStatus).toBe("partial");
    expect(codeMap.failedFileCount).toBe(1);
    expect(codeMap.parseFailureFiles).toEqual([expect.stringMatching(/src\/b\.ts$/)]);

    parseContentSpy.mockRestore();
  });

  it("persists enriched Python typeInfo to analyzer output and keeps the TS-readable contract", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "codemap-python-analyzer-"));
    tempDirs.push(rootDir);
    await fs.mkdir(path.join(rootDir, "src"), { recursive: true });
    await copyFixture(rootDir, "type-enhancer-google.py", "supported.py");
    await copyFixture(rootDir, "type-enhancer-ambiguous.py", "ambiguous.py");

    const [enhancedMap, baselineMap] = await Promise.all([
      analyze(withAnalysisContext({
        rootDir,
        mode: "tree-sitter",
        include: ["src/**/*.py"],
        enhanceTypes: true,
      })),
      analyze(withAnalysisContext({
        rootDir,
        mode: "tree-sitter",
        include: ["src/**/*.py"],
        enhanceTypes: false,
      })),
    ]);

    const enhancedModule = enhancedMap.modules.find((module) => module.path.endsWith("/src/supported.py"));
    const baselineModule = baselineMap.modules.find((module) => module.path.endsWith("/src/supported.py"));
    const ambiguousModule = enhancedMap.modules.find((module) => module.path.endsWith("/src/ambiguous.py"));

    expect(enhancedModule?.typeInfo).toBeDefined();
    expect(enhancedModule?.typeInfo).toEqual(
      expect.objectContaining({
        typeDefinitions: expect.any(Array),
        genericParams: expect.any(Array),
        crossFileRefs: expect.any(Array),
        unionTypes: expect.any(Array),
        intersectionTypes: expect.any(Array),
        typeAliases: expect.any(Array),
      })
    );
    expect(
      enhancedModule?.typeInfo?.typeDefinitions.find((definition) => definition.name === "build_client")?.members
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "name", type: "str" }),
        expect.objectContaining({ name: "alias", type: "Optional[str]" }),
        expect.objectContaining({ name: "return", type: "list[Client]" }),
      ])
    );
    expect(enhancedModule?.typeInfo?.unionTypes).toContain("Optional[str]");
    expect(baselineModule?.typeInfo).toBeUndefined();
    expect(ambiguousModule?.typeInfo?.unionTypes).toEqual([]);
    expect(ambiguousModule?.typeInfo?.typeDefinitions).toEqual([]);
  });
});
