import { describe, it, expect, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

describe('Meals routes', () => {
  afterAll(async () => {
    if (app) await app.close();
  });

  it('should return 401 for GET /api/meals/week without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/meals/week' });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for POST /api/meals without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/meals',
      payload: {
        mealPlanId: '00000000-0000-0000-0000-000000000000',
        dayOfWeek: 'monday',
        mealType: 'dinner',
        title: 'Test Meal',
      },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for PUT /api/meals/:id without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'PUT',
      url: '/api/meals/00000000-0000-0000-0000-000000000000',
      payload: { title: 'Updated' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for DELETE /api/meals/:id without auth', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/meals/00000000-0000-0000-0000-000000000000',
    });
    expect(response.statusCode).toBe(401);
  });
});
