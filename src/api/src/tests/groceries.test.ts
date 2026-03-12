import { describe, it, expect, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

describe('Groceries routes', () => {
  afterAll(async () => {
    if (app) await app.close();
  });

  it('should return 401 for GET /api/groceries/list without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/groceries/list' });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for POST /api/groceries/list/:listId/items without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/groceries/list/00000000-0000-0000-0000-000000000000/items',
      payload: { name: 'Test Item' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for PUT /api/groceries/items/:id without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'PUT',
      url: '/api/groceries/items/00000000-0000-0000-0000-000000000000',
      payload: { checked: true },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for DELETE /api/groceries/items/:id without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/groceries/items/00000000-0000-0000-0000-000000000000',
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for GET /api/groceries/products without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/groceries/products?q=test',
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for POST /api/groceries/list/:listId/generate without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/groceries/list/00000000-0000-0000-0000-000000000000/generate',
    });
    expect(response.statusCode).toBe(401);
  });
});
