import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { students, homeworkTasks, subjects } from '../db/schema.js';
import type { Student, HomeworkTask } from '../db/schema.js';

interface TaskWithRelations extends HomeworkTask {
  student?: { id: string; name: string; color: string; grade: string | null } | null;
  subject?: { id: string; name: string; color: string } | null;
}

export async function listTasks(
  familyId: string,
  filters: { studentId?: string; completed?: boolean },
): Promise<TaskWithRelations[]> {
  const familyStudents = await db
    .select()
    .from(students)
    .where(eq(students.familyId, familyId));

  if (familyStudents.length === 0) return [];

  const studentIds = filters.studentId
    ? [filters.studentId]
    : familyStudents.map((s) => s.id);

  const conditions = [inArray(homeworkTasks.studentId, studentIds)];
  if (filters.completed !== undefined) {
    conditions.push(eq(homeworkTasks.completed, filters.completed));
  }

  const tasks = await db
    .select()
    .from(homeworkTasks)
    .where(and(...conditions));

  if (tasks.length === 0) return [];

  // Build lookup maps
  const studentMap = new Map(familyStudents.map(s => [s.id, s]));

  const subjectIds = tasks.map(t => t.subjectId).filter((id): id is string => !!id);
  const subjectMap = new Map<string, { id: string; name: string; color: string }>();
  if (subjectIds.length > 0) {
    const subjectRows = await db.select().from(subjects).where(inArray(subjects.id, subjectIds));
    for (const s of subjectRows) {
      subjectMap.set(s.id, { id: s.id, name: s.name, color: s.color });
    }
  }

  return tasks.map(task => {
    const student = studentMap.get(task.studentId);
    const subject = task.subjectId ? subjectMap.get(task.subjectId) ?? null : null;
    return {
      ...task,
      student: student ? { id: student.id, name: student.name, color: student.color, grade: student.grade } : null,
      subject,
    };
  });
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

export async function getStudents(familyId: string): Promise<Student[]> {
  return db.select().from(students).where(eq(students.familyId, familyId));
}

export async function createStudent(
  familyId: string,
  userId: string,
  data: { name: string; grade?: string; color?: string },
): Promise<Student> {
  const [student] = await db
    .insert(students)
    .values({
      familyId,
      userId,
      name: data.name,
      grade: data.grade ?? null,
      color: data.color ?? '#6366f1',
    })
    .returning();
  return student!;
}
