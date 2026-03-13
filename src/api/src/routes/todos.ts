import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as todoService from '../services/todo-service.js';

const priorityEnum = z.enum(['low', 'medium', 'high']);
const frequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'custom']);

const createTodoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: priorityEnum.optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: priorityEnum.optional(),
  done: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().nullable().optional(),
});

const createRecurringSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  frequency: frequencyEnum,
  intervalDays: z.number().int().positive().optional(),
  priority: priorityEnum.optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const todosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get<{ Querystring: { done?: string } }>('/', async (request) => {
    const done = request.query.done === 'true' ? true : request.query.done === 'false' ? false : undefined;
    const items = await todoService.listTodos(request.currentUser.id, done);
    return items.map(t => ({ ...t, tags: JSON.parse(t.tags ?? '[]') }));
  });

  fastify.post('/', async (request, reply) => {
    const parsed = createTodoSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    const todo = await todoService.createTodo(request.currentUser.id, parsed.data);
    return reply.status(201).send({ ...todo, tags: JSON.parse(todo.tags ?? '[]') });
  });

  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateTodoSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    try {
      const todo = await todoService.updateTodo(request.params.id, parsed.data);
      return { ...todo, tags: JSON.parse(todo.tags ?? '[]') };
    } catch {
      return reply.status(404).send({ error: 'Not found' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await todoService.deleteTodo(request.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Not found' });
    }
  });

  // Recurring
  fastify.get('/recurring', async (request) => {
    const items = await todoService.listRecurringTodos(request.currentUser.id);
    return items.map(r => ({ ...r, tags: JSON.parse(r.tags ?? '[]') }));
  });

  fastify.post('/recurring', async (request, reply) => {
    const parsed = createRecurringSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    const recurring = await todoService.createRecurringTodo(request.currentUser.id, parsed.data);
    return reply.status(201).send({ ...recurring, tags: JSON.parse(recurring.tags ?? '[]') });
  });

  fastify.put<{ Params: { id: string } }>('/recurring/:id', async (request, reply) => {
    const parsed = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      priority: priorityEnum.optional(),
      tags: z.array(z.string()).optional(),
      assignedTo: z.string().nullable().optional(),
      active: z.boolean().optional(),
      frequency: frequencyEnum.optional(),
      intervalDays: z.number().int().positive().nullable().optional(),
    }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    try {
      const recurring = await todoService.updateRecurringTodo(request.params.id, parsed.data);
      return { ...recurring, tags: JSON.parse(recurring.tags ?? '[]') };
    } catch {
      return reply.status(404).send({ error: 'Not found' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/recurring/:id', async (request, reply) => {
    try {
      await todoService.deleteRecurringTodo(request.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Not found' });
    }
  });
};

export default todosRoutes;
