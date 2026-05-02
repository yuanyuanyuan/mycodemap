declare module 'typhonjs-escomplex' {
  interface ModuleReport {
    maintainability: number;
    methods: { cyclomatic: number; name: string }[];
    aggregate?: { cyclomatic: number };
  }

  export function analyzeModule(source: string | { ast: unknown }, options?: Record<string, unknown>): ModuleReport;
}
