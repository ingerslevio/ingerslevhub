import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { mealPlans, meals, recipes } from '../db/schema.js';
import type { MealPlan, Meal, Recipe } from '../db/schema.js';

export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diff);
  return monday.toISOString().split('T')[0]!;
}

export async function getOrCreateWeekPlan(
  userId: string,
  weekStart: string,
): Promise<MealPlan & { meals: (Meal & { recipe?: Recipe | null })[] }> {
  const mondayDate = getWeekStart(weekStart);

  const existing = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.userId, userId), eq(mealPlans.weekStart, mondayDate)))
    .limit(1);

  let plan: MealPlan;
  if (existing.length > 0) {
    plan = existing[0]!;
  } else {
    const [created] = await db
      .insert(mealPlans)
      .values({ userId, weekStart: mondayDate })
      .returning();
    plan = created!;
  }

  const planMeals = await db
    .select({ meal: meals, recipe: recipes })
    .from(meals)
    .leftJoin(recipes, eq(meals.recipeId, recipes.id))
    .where(eq(meals.mealPlanId, plan.id));

  const enrichedMeals = planMeals.map((r) => ({ ...r.meal, recipe: r.recipe ?? null }));

  return { ...plan, meals: enrichedMeals };
}

export async function addMeal(
  mealPlanId: string,
  data: {
    dayOfWeek: string;
    mealType: string;
    title: string;
    notes?: string;
    recipeId?: string;
    personCount?: number;
  },
): Promise<Meal> {
  const [meal] = await db
    .insert(meals)
    .values({
      mealPlanId,
      dayOfWeek: data.dayOfWeek as Meal['dayOfWeek'],
      mealType: data.mealType as Meal['mealType'],
      title: data.title,
      notes: data.notes ?? null,
      recipeId: data.recipeId ?? null,
      personCount: data.personCount ?? null,
    })
    .returning();
  return meal!;
}

export async function updateMeal(
  id: string,
  data: Partial<{
    title: string;
    notes: string | null;
    dayOfWeek: string;
    mealType: string;
    recipeId: string | null;
    personCount: number | null;
    rating: number | null;
  }>,
): Promise<Meal> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData['title'] = data.title;
  if (data.notes !== undefined) updateData['notes'] = data.notes;
  if (data.dayOfWeek !== undefined) updateData['dayOfWeek'] = data.dayOfWeek;
  if (data.mealType !== undefined) updateData['mealType'] = data.mealType;
  if (data.recipeId !== undefined) updateData['recipeId'] = data.recipeId;
  if (data.personCount !== undefined) updateData['personCount'] = data.personCount;
  if (data.rating !== undefined) updateData['rating'] = data.rating;

  const [meal] = await db
    .update(meals)
    .set(updateData)
    .where(eq(meals.id, id))
    .returning();
  if (!meal) throw new Error('Meal not found');
  return meal;
}

export async function deleteMeal(id: string): Promise<void> {
  const result = await db.delete(meals).where(eq(meals.id, id)).returning();
  if (result.length === 0) throw new Error('Meal not found');
}
