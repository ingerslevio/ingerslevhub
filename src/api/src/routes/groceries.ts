import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as groceryService from '../services/grocery-service.js';

const addItemSchema = z.object({
  name: z.string().min(1).max(200),
  productId: z.string().uuid().optional(),
  quantity: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  buyOnDiscount: z.boolean().optional(),
});

const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  buyOnDiscount: z.boolean().optional(),
  checked: z.boolean().optional(),
});

const groceriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get<{ Querystring: { weekStart?: string } }>('/list', async (request) => {
    const weekStart = request.query.weekStart ?? new Date().toISOString().split('T')[0]!;
    return groceryService.getOrCreateList(request.currentUser.id, weekStart);
  });

  fastify.post<{ Params: { listId: string } }>('/list/:listId/items', async (request, reply) => {
    const parsed = addItemSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    const item = await groceryService.addItem(request.params.listId, parsed.data);
    return reply.status(201).send(item);
  });

  fastify.put<{ Params: { id: string } }>('/items/:id', async (request, reply) => {
    const parsed = updateItemSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    try {
      return await groceryService.updateItem(request.params.id, parsed.data);
    } catch {
      return reply.status(404).send({ error: 'Item not found' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/items/:id', async (request, reply) => {
    try {
      await groceryService.deleteItem(request.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Item not found' });
    }
  });

  fastify.post<{ Params: { listId: string }; Querystring: { weekStart?: string } }>(
    '/list/:listId/generate', async (request, reply) => {
      const weekStart = (request.query as { weekStart?: string }).weekStart ?? new Date().toISOString().split('T')[0]!;
      await groceryService.generateFromMealPlan(request.currentUser.id, weekStart, request.params.listId);
      return reply.status(200).send({ ok: true });
    }
  );

  fastify.get<{ Querystring: { q?: string } }>('/products', async (request) => {
    const q = request.query.q ?? '';
    return groceryService.searchProducts(request.currentUser.id, q);
  });
};

export default groceriesRoutes;
