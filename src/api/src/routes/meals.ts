import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as mealService from '../services/meal-service.js';

const addMealSchema = z.object({
  mealPlanId: z.string().uuid(),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  recipeId: z.string().uuid().optional(),
  personCount: z.number().int().positive().optional(),
});

const updateMealSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional().nullable(),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']).optional(),
  recipeId: z.string().uuid().nullable().optional(),
  personCount: z.number().int().positive().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

const mealsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get<{ Querystring: { date?: string } }>('/week', async (request) => {
    const userId = request.currentUser.id;
    const date = request.query.date ?? new Date().toISOString().split('T')[0]!;
    return mealService.getOrCreateWeekPlan(userId, date);
  });

  fastify.post('/', async (request, reply) => {
    const parsed = addMealSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const meal = await mealService.addMeal(parsed.data.mealPlanId, parsed.data);
    return reply.status(201).send(meal);
  });

  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateMealSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      return await mealService.updateMeal(request.params.id, parsed.data);
    } catch {
      return reply.status(404).send({ error: 'Meal not found' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await mealService.deleteMeal(request.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Meal not found' });
    }
  });
};

export default mealsRoutes;
