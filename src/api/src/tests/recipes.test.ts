import { describe, it, expect, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

describe('Recipes routes', () => {
  afterAll(async () => {
    if (app) await app.close();
  });

  it('should return 401 for GET /api/recipes without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/recipes' });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for POST /api/recipes without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: { name: 'Test Recipe' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for PUT /api/recipes/:id without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'PUT',
      url: '/api/recipes/00000000-0000-0000-0000-000000000000',
      payload: { name: 'Updated Recipe' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for DELETE /api/recipes/:id without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/recipes/00000000-0000-0000-0000-000000000000',
    });
    expect(response.statusCode).toBe(401);
  });
});
