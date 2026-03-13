import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { todos, recurringTodos } from '../db/schema.js';
import type { Todo, RecurringTodo } from '../db/schema.js';

function nextDueDate(frequency: string, intervalDays: number | null, fromDate: Date): string {
  const d = new Date(fromDate);
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'custom' && intervalDays) d.setDate(d.getDate() + intervalDays);
  return d.toISOString().slice(0, 10);
}

export async function listTodos(familyId: string, done?: boolean): Promise<Todo[]> {
  const conditions = [eq(todos.familyId, familyId)];
  if (done !== undefined) conditions.push(eq(todos.done, done));
  return db.select().from(todos)
    .where(and(...conditions))
    .orderBy(asc(todos.dueDate), asc(todos.createdAt));
}

export async function createTodo(familyId: string, userId: string, data: {
  title: string; description?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high';
  tags?: string[]; assignedTo?: string; recurringTodoId?: string;
}): Promise<Todo> {
  const [todo] = await db.insert(todos).values({
    familyId,
    userId,
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate ?? null,
    priority: data.priority ?? 'medium',
    tags: JSON.stringify(data.tags ?? []),
    assignedTo: data.assignedTo ?? null,
    recurringTodoId: data.recurringTodoId ?? null,
  }).returning();
  return todo!;
}

export async function updateTodo(id: string, data: Partial<{
  title: string; description: string | null; dueDate: string | null; priority: 'low' | 'medium' | 'high';
  done: boolean; tags: string[]; assignedTo: string | null;
}>): Promise<Todo> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
  if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

  if (data.done === true) {
    updateData.done = true;
    updateData.doneAt = new Date();
  } else if (data.done === false) {
    updateData.done = false;
    updateData.doneAt = null;
  }

  const [updated] = await db.update(todos).set(updateData).where(eq(todos.id, id)).returning();
  if (!updated) throw new Error('Todo not found');

  // If marking done and recurring, create next instance
  if (data.done === true && updated.recurringTodoId) {
    const [recurring] = await db.select().from(recurringTodos).where(eq(recurringTodos.id, updated.recurringTodoId)).limit(1);
    if (recurring && recurring.active) {
      const fromDate = updated.dueDate ? new Date(updated.dueDate) : new Date();
      const next = nextDueDate(recurring.frequency, recurring.intervalDays, fromDate);
      await db.insert(todos).values({
        userId: updated.userId,
        title: recurring.title,
        description: recurring.description,
        dueDate: next,
        priority: recurring.priority,
        tags: recurring.tags,
        assignedTo: recurring.assignedTo,
        recurringTodoId: recurring.id,
      });
    }
  }

  return updated;
}

export async function deleteTodo(id: string): Promise<void> {
  const result = await db.delete(todos).where(eq(todos.id, id)).returning();
  if (result.length === 0) throw new Error('Todo not found');
}

export async function listRecurringTodos(familyId: string): Promise<RecurringTodo[]> {
  return db.select().from(recurringTodos)
    .where(and(eq(recurringTodos.familyId, familyId), eq(recurringTodos.active, true)))
    .orderBy(asc(recurringTodos.createdAt));
}

export async function createRecurringTodo(familyId: string, userId: string, data: {
  title: string; description?: string; frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  intervalDays?: number; priority?: 'low' | 'medium' | 'high'; tags?: string[];
  assignedTo?: string; firstDueDate?: string;
}): Promise<RecurringTodo> {
  const [recurring] = await db.insert(recurringTodos).values({
    userId,
    title: data.title,
    description: data.description ?? null,
    frequency: data.frequency,
    intervalDays: data.intervalDays ?? null,
    priority: data.priority ?? 'medium',
    tags: JSON.stringify(data.tags ?? []),
    assignedTo: data.assignedTo ?? null,
  }).returning();

  // Create first instance
  const dueDate = data.firstDueDate ?? new Date().toISOString().slice(0, 10);
  await db.insert(todos).values({
    userId,
    title: recurring!.title,
    description: recurring!.description,
    dueDate,
    priority: recurring!.priority,
    tags: recurring!.tags,
    assignedTo: recurring!.assignedTo,
    recurringTodoId: recurring!.id,
  });

  return recurring!;
}

export async function updateRecurringTodo(id: string, data: Partial<{
  title: string; description: string | null; priority: 'low' | 'medium' | 'high';
  tags: string[]; assignedTo: string | null; active: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'; intervalDays: number | null;
}>): Promise<RecurringTodo> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
  if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.intervalDays !== undefined) updateData.intervalDays = data.intervalDays;

  const [updated] = await db.update(recurringTodos).set(updateData).where(eq(recurringTodos.id, id)).returning();
  if (!updated) throw new Error('Recurring todo not found');
  return updated;
}

export async function deleteRecurringTodo(id: string): Promise<void> {
  // Delete future (undone) instances, then delete the recurring template
  await db.delete(todos).where(and(eq(todos.recurringTodoId, id), eq(todos.done, false)));
  await db.delete(recurringTodos).where(eq(recurringTodos.id, id));
}
