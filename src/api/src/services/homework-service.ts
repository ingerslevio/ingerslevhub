import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { students, homeworkTasks } from '../db/schema.js';
import type { Student, HomeworkTask } from '../db/schema.js';

export async function listTasks(
  userId: string,
  filters: { studentId?: string; completed?: boolean },
): Promise<HomeworkTask[]> {
  const userStudents = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.userId, userId));

  if (userStudents.length === 0) return [];

  const studentIds = filters.studentId
    ? [filters.studentId]
    : userStudents.map((s) => s.id);

  const allTasks: HomeworkTask[] = [];
  for (const studentId of studentIds) {
    const conditions = [eq(homeworkTasks.studentId, studentId)];
    if (filters.completed !== undefined) {
      conditions.push(eq(homeworkTasks.completed, filters.completed));
    }
    const tasks = await db
      .select()
      .from(homeworkTasks)
      .where(and(...conditions));
    allTasks.push(...tasks);
  }

  return allTasks;
}

export async function createTask(data: {
  studentId: string;
  subjectId?: string;
  title: string;
  description?: string;
  dueDate?: string;
}): Promise<HomeworkTask> {
  const [task] = await db
    .insert(homeworkTasks)
    .values({
      studentId: data.studentId,
      subjectId: data.subjectId ?? null,
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
    })
    .returning();
  return task!;
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    dueDate: string;
    completed: boolean;
    subjectId: string;
  }>,
): Promise<HomeworkTask> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData['title'] = data.title;
  if (data.description !== undefined) updateData['description'] = data.description;
  if (data.dueDate !== undefined) updateData['dueDate'] = data.dueDate;
  if (data.subjectId !== undefined) updateData['subjectId'] = data.subjectId;

  if (data.completed !== undefined) {
    updateData['completed'] = data.completed;
    updateData['completedAt'] = data.completed ? new Date() : null;
  }

  const [task] = await db
    .update(homeworkTasks)
    .set(updateData)
    .where(eq(homeworkTasks.id, id))
    .returning();
  if (!task) throw new Error('Task not found');
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const result = await db.delete(homeworkTasks).where(eq(homeworkTasks.id, id)).returning();
  if (result.length === 0) throw new Error('Task not found');
}

export async function getStudents(userId: string): Promise<Student[]> {
  return db.select().from(students).where(eq(students.userId, userId));
}

export async function createStudent(
  userId: string,
  data: { name: string; grade?: string; color?: string },
): Promise<Student> {
  const [student] = await db
    .insert(students)
    .values({
      userId,
      name: data.name,
      grade: data.grade ?? null,
      color: data.color ?? '#6366f1',
    })
    .returning();
  return student!;
}
