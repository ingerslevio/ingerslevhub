import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { recipes } from '../db/schema.js';
import type { Recipe } from '../db/schema.js';

export async function listRecipes(userId: string): Promise<Recipe[]> {
  return db.select().from(recipes).where(eq(recipes.userId, userId));
}

export async function createRecipe(userId: string, data: {
  name: string; description?: string; ingredients?: string;
  instructions?: string; prepTimeMinutes?: number; cookTimeMinutes?: number; servings?: number;
}): Promise<Recipe> {
  const [recipe] = await db.insert(recipes).values({
    userId,
    name: data.name,
    description: data.description ?? null,
    ingredients: data.ingredients ?? '[]',
    instructions: data.instructions ?? null,
    prepTimeMinutes: data.prepTimeMinutes ?? null,
    cookTimeMinutes: data.cookTimeMinutes ?? null,
    servings: data.servings ?? null,
  }).returning();
  return recipe!;
}

export async function updateRecipe(id: string, userId: string, data: Partial<{
  name: string; description: string; ingredients: string;
  instructions: string; prepTimeMinutes: number; cookTimeMinutes: number; servings: number;
}>): Promise<Recipe> {
  const [recipe] = await db.update(recipes).set(data).where(
    and(eq(recipes.id, id), eq(recipes.userId, userId))
  ).returning();
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
}

export async function deleteRecipe(id: string, userId: string): Promise<void> {
  const result = await db.delete(recipes).where(
    and(eq(recipes.id, id), eq(recipes.userId, userId))
  ).returning();
  if (result.length === 0) throw new Error('Recipe not found');
}
