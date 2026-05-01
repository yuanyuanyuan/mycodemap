declare module 'sql.js' {
  export interface QueryResult {
    columns: string[];
    values: unknown[][];
  }

  export class Database {
    constructor(data?: Uint8Array | null);
    run(sql: string, params?: unknown[]): QueryResult[];
    exec(sql: string, params?: unknown[]): QueryResult[];
    export(): Uint8Array;
    close(): void;
  }

  const SQL: {
    Database: typeof Database;
  };

  export default SQL;
}
