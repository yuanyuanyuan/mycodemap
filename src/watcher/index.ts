// ============================================
// Watcher Module - 文件监控和守护进程
// ============================================

export { WatchDaemon, createWatchDaemon } from './daemon.js';
export type { WatchDaemonConfig, WatchDaemonStatus } from './daemon.js';

export { FileWatcher, createFileWatcher } from './file-watcher.js';
export type { FileWatcherConfig, FileChangeEvent, FileChangeHandler } from './file-watcher.js';
