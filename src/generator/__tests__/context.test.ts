import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { ModuleInfo } from "../../types/index.js";
import { generateAllContexts } from "../context.js";

const tempDirs: string[] = [];

function createModule(partial: Partial<ModuleInfo> & { id: string; path: string }): ModuleInfo {
  return {
    id: partial.id,
    path: partial.path,
    absolutePath: partial.path,
    type: "source",
    stats: {
      lines: 10,
      codeLines: 8,
      commentLines: 1,
      blankLines: 1,
    },
    exports: [],
    imports: [],
    symbols: [],
    dependencies: [],
    dependents: [],
    ...partial,
  };
}

async function createTempDirs(): Promise<{ rootDir: string; outputDir: string }> {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "codemap-context-root-"));
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "codemap-context-out-"));
  tempDirs.push(rootDir, outputDir);
  return { rootDir, outputDir };
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("generateAllContexts", () => {
  it("writes valid context index links and root CONTEXT entry", async () => {
    const { rootDir, outputDir } = await createTempDirs();
    const moduleAPath = path.join(rootDir, "src", "a.ts");
    const moduleBPath = path.join(rootDir, "src", "b.ts");

    const modules: ModuleInfo[] = [
      createModule({
        id: "module-a",
        path: moduleAPath,
        dependencies: ["./b.js"],
      }),
      createModule({
        id: "module-b",
        path: moduleBPath,
        dependents: ["module-a"],
      }),
    ];

    await generateAllContexts(modules, rootDir, outputDir);

    const contextIndex = await fs.readFile(path.join(outputDir, "context", "README.md"), "utf-8");
    expect(contextIndex).toContain("[src/a.ts](./src/a.md)");
    expect(contextIndex).toContain("[src/b.ts](./src/b.md)");

    const rootContext = await fs.readFile(path.join(outputDir, "CONTEXT.md"), "utf-8");
    expect(rootContext).toContain("./context/README.md");
  });

  it("uses dependents to render accurate Imported By list", async () => {
    const { rootDir, outputDir } = await createTempDirs();
    const moduleAPath = path.join(rootDir, "src", "a.ts");
    const moduleBPath = path.join(rootDir, "src", "b.ts");

    const modules: ModuleInfo[] = [
      createModule({
        id: "module-a",
        path: moduleAPath,
      }),
      createModule({
        id: "module-b",
        path: moduleBPath,
        dependents: ["module-a", "module-b"],
      }),
    ];

    await generateAllContexts(modules, rootDir, outputDir);

    const moduleBContext = await fs.readFile(path.join(outputDir, "context", "src", "b.md"), "utf-8");
    expect(moduleBContext).toContain("## Imported By");
    expect(moduleBContext).toContain("`src/a.ts`");
    expect(moduleBContext).not.toContain("`src/b.ts`");
  });
});
