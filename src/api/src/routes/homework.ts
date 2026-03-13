import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as homeworkService from '../services/homework-service.js';

const createTaskSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  completed: z.boolean().optional(),
  subjectId: z.string().uuid().optional(),
});

const createStudentSchema = z.object({
  name: z.string().min(1).max(100),
  grade: z.string().max(20).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex color').optional(),
});

const homeworkRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get<{ Querystring: { student?: string; completed?: string } }>(
    '/',
    async (request) => {
      const familyId = request.currentFamilyId;
      const filters: { studentId?: string; completed?: boolean } = {};
      if (request.query.student) filters.studentId = request.query.student;
      if (request.query.completed !== undefined) {
        filters.completed = request.query.completed === 'true';
      }
      return homeworkService.listTasks(familyId, filters);
    },
  );

  fastify.post('/', async (request, reply) => {
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const task = await homeworkService.createTask(parsed.data);
    return reply.status(201).send(task);
  });

  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      return await homeworkService.updateTask(request.params.id, parsed.data);
    } catch {
      return reply.status(404).send({ error: 'Task not found' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await homeworkService.deleteTask(request.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Task not found' });
    }
  });

  fastify.get('/students', async (request) => {
    return homeworkService.getStudents(request.currentFamilyId);
  });

  fastify.post('/students', async (request, reply) => {
    const parsed = createStudentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const student = await homeworkService.createStudent(request.currentFamilyId, request.currentUser.id, parsed.data);
    return reply.status(201).send(student);
  });
};

export default homeworkRoutes;
