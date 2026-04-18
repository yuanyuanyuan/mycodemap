// [META] since:2026-04 | owner:architecture-team | stable:false
// [WHY] SQLite governance schema definition and versioning for Phase 26 normalized storage
// ============================================
// SQLite 治理存储 schema 定义与版本管理
// ============================================

export const CURRENT_SQLITE_SCHEMA_VERSION = 'governance-v3';

export const SQLITE_SCHEMA_VERSION_UPSERT_SQL = `
  INSERT INTO metadata (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`;

export const SQLITE_GOVERNANCE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    path TEXT NOT NULL,
    language TEXT NOT NULL,
    lines INTEGER NOT NULL,
    code_lines INTEGER NOT NULL,
    comment_lines INTEGER NOT NULL,
    blank_lines INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    signature TEXT,
    file_path TEXT NOT NULL,
    line INTEGER NOT NULL,
    column_number INTEGER NOT NULL,
    end_line INTEGER,
    end_column INTEGER,
    visibility TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dependencies (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_entity_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    dependency_type TEXT NOT NULL,
    file_path TEXT,
    line INTEGER,
    confidence TEXT
  );

  CREATE TABLE IF NOT EXISTS history_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    snapshot_source TEXT NOT NULL,
    module_count INTEGER NOT NULL,
    symbol_count INTEGER NOT NULL,
    dependency_count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS history_relations (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_entity_type TEXT NOT NULL,
    target_id TEXT,
    target_entity_type TEXT,
    observed_at TEXT NOT NULL,
    metadata_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    graph_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_modules_project_id
    ON modules (project_id);
  CREATE INDEX IF NOT EXISTS idx_modules_path
    ON modules (path);
  CREATE INDEX IF NOT EXISTS idx_symbols_module_id
    ON symbols (module_id);
  CREATE INDEX IF NOT EXISTS idx_symbols_name
    ON symbols (name);
  CREATE INDEX IF NOT EXISTS idx_dependencies_source
    ON dependencies (source_id, dependency_type);
  CREATE INDEX IF NOT EXISTS idx_dependencies_target
    ON dependencies (target_id, dependency_type);
  CREATE INDEX IF NOT EXISTS idx_history_snapshots_project
    ON history_snapshots (project_id, recorded_at DESC);
  CREATE INDEX IF NOT EXISTS idx_history_relations_snapshot
    ON history_relations (snapshot_id);
  CREATE INDEX IF NOT EXISTS idx_history_relations_source
    ON history_relations (source_id, relation_type);
`;
