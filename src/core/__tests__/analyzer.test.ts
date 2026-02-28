import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { analyze } from "../analyzer.js";

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

describe("analyze", () => {
  it("fills dependents and deduplicates dependency edges", async () => {
    const rootDir = await createTempProject();

    const codeMap = await analyze({
      rootDir,
      mode: "fast",
      include: ["src/**/*.ts"],
    });

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

    const codeMap = await analyze({
      rootDir,
      mode: "smart",
      include: ["src/**/*.ts"],
    });

    const ids = new Set(codeMap.modules.map((m) => m.id));
    expect(ids.size).toBe(codeMap.modules.length);
  });

  it("resolves smart-mode relative dependencies to local modules", async () => {
    const rootDir = await createTempProject();

    const codeMap = await analyze({
      rootDir,
      mode: "smart",
      include: ["src/**/*.ts"],
    });

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
});
