import { describe, it, expect, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

describe('Auth - unauthenticated requests', () => {
  afterAll(async () => {
    if (app) await app.close();
  });

  it('should return 401 for GET /api/meals/week without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/meals/week' });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for GET /api/recipes without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/recipes' });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for GET /api/groceries/list without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/groceries/list' });
    expect(response.statusCode).toBe(401);
  });

  it('should allow GET /api/health without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
