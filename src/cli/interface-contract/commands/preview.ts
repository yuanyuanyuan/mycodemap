// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Interface contract for the `preview` command family

import type { CommandContract } from '../types.js';

export const previewContract: CommandContract = {
  name: 'preview',
  description: 'Zero-config project preview — file count, modules, dependencies, complexity',
  args: [],
  flags: [
    {
      name: 'save',
      long: 'save',
      description: 'Save profile config and run full generate',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'human',
      long: 'human',
      description: 'Force human-readable output',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'json',
      short: 'j',
      long: 'json',
      description: 'Force JSON output',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'profile',
      long: 'profile',
      description: 'Skip detection, use specified profile (nodejs|python|go|rust|generic)',
      type: 'string',
      defaultValue: undefined,
    },
  ],
  outputShape: {
    description: 'Project preview summary',
    type: 'object',
    properties: [
      { name: 'projectType', type: 'string', description: 'Detected or specified project type' },
      { name: 'profile', type: 'string', description: 'Profile name used for analysis' },
      {
        name: 'files',
        type: 'object',
        description: 'File discovery results',
        properties: [
          { name: 'total', type: 'number', description: 'Total source files found' },
          { name: 'byExtension', type: 'object', description: 'File count by extension' },
        ],
      },
      {
        name: 'modules',
        type: 'object',
        description: 'Module grouping results',
        properties: [
          { name: 'count', type: 'number', description: 'Number of distinct module directories' },
          {
            name: 'top',
            type: 'array',
            description: 'Top directories by file count',
            items: { name: 'dir', type: 'string' },
          },
        ],
      },
      {
        name: 'dependencies',
        type: 'object',
        description: 'Direct dependencies from marker files',
        properties: [
          {
            name: 'direct',
            type: 'array',
            description: 'Dependency names',
            items: { name: 'dep', type: 'string' },
          },
          { name: 'count', type: 'number', description: 'Total dependency count' },
        ],
      },
      {
        name: 'complexity',
        type: 'object',
        description: 'Complexity hotspot analysis',
        properties: [
          {
            name: 'hotspots',
            type: 'array',
            description: 'Top-5 files by cyclomatic complexity',
            items: {
              name: 'hotspot',
              type: 'object',
              properties: [
                { name: 'file', type: 'string' },
                { name: 'score', type: 'number' },
                { name: 'functions', type: 'number' },
              ],
            },
          },
        ],
      },
      { name: 'hint', type: 'string', description: 'Next-step guidance text' },
    ],
  },
  errorCodes: [
    { code: 'PREVIEW_PROFILE_LOAD_FAILED', description: 'Failed to load bootstrap profile' },
    { code: 'PREVIEW_NO_FILES_FOUND', description: 'No source files discovered' },
  ],
  examples: [
    'codemap preview',
    'codemap preview --save',
    'codemap preview --json',
    'codemap preview --profile nodejs',
    'codemap preview --human',
  ],
};
