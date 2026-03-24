// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] API route tests for analysis endpoints returning explicit unsupported contracts
// ============================================

import { describe, expect, it } from 'vitest';
import { createApiRoutes } from '../api.js';
import { UnsupportedAnalysisOperationError } from '../../handlers/AnalysisHandler.js';
import type { QueryHandler } from '../../handlers/QueryHandler.js';
import type { AnalysisHandler } from '../../handlers/AnalysisHandler.js';

describe('analysis API routes', () => {
  it('returns 501 for unsupported analyze requests', async () => {
    const app = createApiRoutes(
      {} as unknown as QueryHandler,
      {
        analyze: async () => {
          throw new UnsupportedAnalysisOperationError('analyze');
        },
      } as unknown as AnalysisHandler
    );

    const response = await app.request('/analysis', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ projectPath: '/tmp/demo' }),
    });

    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({
      success: false,
      error: {
        code: 'ANALYSIS_NOT_SUPPORTED',
      },
    });
  });

  it('returns 501 for unsupported refresh requests', async () => {
    const app = createApiRoutes(
      {} as unknown as QueryHandler,
      {
        refresh: async () => {
          throw new UnsupportedAnalysisOperationError('refresh');
        },
      } as unknown as AnalysisHandler
    );

    const response = await app.request('/analysis/refresh', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ projectPath: '/tmp/demo' }),
    });

    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({
      success: false,
      error: {
        code: 'REFRESH_NOT_SUPPORTED',
      },
    });
  });
});
