import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as groceryService from '../services/grocery-service.js';

const addItemSchema = z.object({
  name: z.string().min(1).max(200),
  productId: z.string().uuid().optional(),
  quantity: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  buyOnDiscount: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

const updateItemSchema = z.object({
  quantity: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  buyOnDiscount: z.boolean().optional(),
  checked: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().optional(),
  color: z.string().optional(),
});

const updateProductCategorySchema = z.object({
  categoryId: z.string().uuid().nullable(),
});

const fromMealItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(100).optional(),
  unit: z.string().max(50).optional(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
});

const addItemsFromMealSchema = z.object({
  mealId: z.string().uuid(),
  items: z.array(fromMealItemSchema).min(1),
});

const groceriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET active list with items
  fastify.get('/list', async (request) => {
    return groceryService.getOrCreateActiveList(request.currentUser.id);
  });

  // POST add item to active list
  fastify.post('/list/items', async (request, reply) => {
    const parsed = addItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const list = await groceryService.getOrCreateActiveList(request.currentUser.id);
    const item = await groceryService.addItem(list.id, parsed.data);
    return reply.status(201).send(item);
  });

  // POST add items from a meal to active list
  fastify.post('/list/items/from-meal', async (request, reply) => {
    const parsed = addItemsFromMealSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const list = await groceryService.getOrCreateActiveList(request.currentUser.id);
    const items = await groceryService.addItemsFromMeal(
      list.id,
      request.currentUser.id,
      parsed.data.items,
      parsed.data.mealId,
    );
    return reply.status(201).send(items);
  });

  // POST generate from meal plan (no weekStart needed - uses active list)
  fastify.post<{ Querystring: { weekStart?: string } }>(
    '/list/generate',
    async (request, reply) => {
      const weekStart =
        (request.query as { weekStart?: string }).weekStart ??
        new Date().toISOString().split('T')[0]!;
      await groceryService.generateFromMealPlan(request.currentUser.id, weekStart);
      return reply.status(200).send({ ok: true });
    },
  );

  // DELETE clear bought items from active list
  fastify.delete('/list/clear-bought', async (request, reply) => {
    const list = await groceryService.getOrCreateActiveList(request.currentUser.id);
    await groceryService.clearBought(list.id);
    return reply.status(200).send({ ok: true });
  });

  // PUT update item
  fastify.put<{ Params: { id: string } }>('/items/:id', async (request, reply) => {
    const parsed = updateItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      return await groceryService.updateItem(request.params.id, parsed.data);
    } catch {
      return reply.status(404).send({ error: 'Item not found' });
    }
  });

  // DELETE item
  fastify.delete<{ Params: { id: string } }>('/items/:id', async (request, reply) => {
    try {
      await groceryService.deleteItem(request.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Item not found' });
    }
  });

  // GET search products with category
  fastify.get<{ Querystring: { q?: string } }>('/products', async (request) => {
    const q = request.query.q ?? '';
    return groceryService.searchProducts(request.currentUser.id, q);
  });

  // PATCH update product category (legacy)
  fastify.patch<{ Params: { id: string } }>('/products/:id/category', async (request, reply) => {
    const parsed = updateProductCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      return await groceryService.updateProductCategory(
        request.params.id,
        parsed.data.categoryId,
      );
    } catch {
      return reply.status(404).send({ error: 'Product not found' });
    }
  });

  // PATCH update product (name and/or category)
  fastify.patch<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const parsed = updateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      return await groceryService.updateProduct(
        request.params.id,
        request.currentUser.id,
        parsed.data,
      );
    } catch {
      return reply.status(404).send({ error: 'Product not found' });
    }
  });

  // GET categories
  fastify.get('/categories', async (request) => {
    return groceryService.listCategories(request.currentUser.id);
  });

  // POST create category
  fastify.post('/categories', async (request, reply) => {
    const parsed = createCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const category = await groceryService.createCategory(request.currentUser.id, parsed.data);
    return reply.status(201).send(category);
  });

  // PATCH update category
  fastify.patch<{ Params: { id: string } }>('/categories/:id', async (request, reply) => {
    const parsed = updateCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      return await groceryService.updateCategory(request.params.id, parsed.data);
    } catch {
      return reply.status(404).send({ error: 'Category not found' });
    }
  });

  // DELETE category
  fastify.delete<{ Params: { id: string } }>('/categories/:id', async (request, reply) => {
    await groceryService.deleteCategory(request.params.id);
    return reply.status(204).send();
  });

  // Legacy routes kept for backward compatibility with existing tests
  fastify.post<{ Params: { listId: string } }>('/list/:listId/items', async (request, reply) => {
    const parsed = addItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const item = await groceryService.addItem(request.params.listId, parsed.data);
    return reply.status(201).send(item);
  });

  fastify.post<{ Params: { listId: string }; Querystring: { weekStart?: string } }>(
    '/list/:listId/generate',
    async (request, reply) => {
      const weekStart =
        (request.query as { weekStart?: string }).weekStart ??
        new Date().toISOString().split('T')[0]!;
      await groceryService.generateFromMealPlan(
        request.currentUser.id,
        weekStart,
        request.params.listId,
      );
      return reply.status(200).send({ ok: true });
    },
  );
};

export default groceriesRoutes;
