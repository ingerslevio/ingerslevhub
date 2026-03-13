import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as recipeService from '../services/recipe-service.js';

const recipeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  ingredients: z.string().optional(),
  instructions: z.string().optional(),
  prepTimeMinutes: z.number().int().positive().optional(),
  cookTimeMinutes: z.number().int().positive().optional(),
  servings: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

const recipesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request) => {
    return recipeService.listRecipes(request.currentUser.id);
  });

  fastify.get<{ Querystring: { q?: string } }>('/tags', async (request) => {
    return recipeService.listTags(request.currentUser.id, request.query.q);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      return await recipeService.getRecipe(request.params.id, request.currentUser.id);
    } catch {
      return reply.status(404).send({ error: 'Recipe not found' });
    }
  });

  fastify.post('/', async (request, reply) => {
    const parsed = recipeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const recipe = await recipeService.createRecipe(request.currentUser.id, parsed.data);
    return reply.status(201).send(recipe);
  });

  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = recipeSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      return await recipeService.updateRecipe(request.params.id, request.currentUser.id, parsed.data);
    } catch {
      return reply.status(404).send({ error: 'Recipe not found' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await recipeService.deleteRecipe(request.params.id, request.currentUser.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Recipe not found' });
    }
  });
};

export default recipesRoutes;
