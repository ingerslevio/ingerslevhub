import { eq, and, max, count, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { recipes, meals, recipeTags } from '../db/schema.js';
import type { Recipe, RecipeTag } from '../db/schema.js';

export type EnrichedRecipe = Recipe & {
  lastUsedAt: Date | null;
  timesUsed: number;
  avgRating: number | null;
};

export async function listRecipes(familyId: string): Promise<EnrichedRecipe[]> {
  const result = await db
    .select({
      id: recipes.id,
      userId: recipes.userId,
      name: recipes.name,
      description: recipes.description,
      ingredients: recipes.ingredients,
      instructions: recipes.instructions,
      prepTimeMinutes: recipes.prepTimeMinutes,
      cookTimeMinutes: recipes.cookTimeMinutes,
      servings: recipes.servings,
      imageUrl: recipes.imageUrl,
      sourceUrl: recipes.sourceUrl,
      tags: recipes.tags,
      ratingSum: recipes.ratingSum,
      ratingCount: recipes.ratingCount,
      familyId: recipes.familyId,
      createdAt: recipes.createdAt,
      lastUsedAt: max(meals.createdAt),
      timesUsed: count(meals.id),
      avgRating: sql<number | null>`AVG(${meals.rating})`,
    })
    .from(recipes)
    .leftJoin(meals, eq(meals.recipeId, recipes.id))
    .where(eq(recipes.familyId, familyId))
    .groupBy(recipes.id);

  return result.map((r) => ({
    ...r,
    timesUsed: Number(r.timesUsed),
    avgRating: r.avgRating !== null ? Number(r.avgRating) : null,
  }));
}

export async function getRecipe(id: string, familyId: string): Promise<Recipe> {
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.familyId, familyId)))
    .limit(1);
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
}

export async function createRecipe(
  familyId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    ingredients?: string;
    instructions?: string;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    servings?: number;
    imageUrl?: string;
    sourceUrl?: string;
    tags?: string[];
  },
): Promise<Recipe> {
  const tags = data.tags ?? [];
  const [recipe] = await db
    .insert(recipes)
    .values({
      familyId,
      userId,
      name: data.name,
      description: data.description ?? null,
      ingredients: data.ingredients ?? '[]',
      instructions: data.instructions ?? null,
      prepTimeMinutes: data.prepTimeMinutes ?? null,
      cookTimeMinutes: data.cookTimeMinutes ?? null,
      servings: data.servings ?? null,
      imageUrl: data.imageUrl ?? null,
      sourceUrl: data.sourceUrl ?? null,
      tags: JSON.stringify(tags),
    })
    .returning();

  if (tags.length > 0) {
    await ensureTags(familyId, tags);
  }

  return recipe!;
}

export async function updateRecipe(
  id: string,
  familyId: string,
  data: Partial<{
    name: string;
    description: string;
    ingredients: string;
    instructions: string;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    servings: number;
    imageUrl: string;
    sourceUrl: string;
    tags: string[];
  }>,
): Promise<Recipe> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.description !== undefined) updateData['description'] = data.description;
  if (data.ingredients !== undefined) updateData['ingredients'] = data.ingredients;
  if (data.instructions !== undefined) updateData['instructions'] = data.instructions;
  if (data.prepTimeMinutes !== undefined) updateData['prepTimeMinutes'] = data.prepTimeMinutes;
  if (data.cookTimeMinutes !== undefined) updateData['cookTimeMinutes'] = data.cookTimeMinutes;
  if (data.servings !== undefined) updateData['servings'] = data.servings;
  if (data.imageUrl !== undefined) updateData['imageUrl'] = data.imageUrl;
  if (data.sourceUrl !== undefined) updateData['sourceUrl'] = data.sourceUrl;
  if (data.tags !== undefined) updateData['tags'] = JSON.stringify(data.tags);

  const [recipe] = await db
    .update(recipes)
    .set(updateData)
    .where(and(eq(recipes.id, id), eq(recipes.familyId, familyId)))
    .returning();
  if (!recipe) throw new Error('Recipe not found');

  if (data.tags && data.tags.length > 0) {
    await ensureTags(familyId, data.tags);
  }

  return recipe;
}

export async function deleteRecipe(id: string, familyId: string): Promise<void> {
  const result = await db
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.familyId, familyId)))
    .returning();
  if (result.length === 0) throw new Error('Recipe not found');
}

export async function listTags(familyId: string, q?: string): Promise<RecipeTag[]> {
  if (q) {
    return db
      .select()
      .from(recipeTags)
      .where(
        and(
          eq(recipeTags.familyId, familyId),
          sql`${recipeTags.name} ILIKE ${'%' + q + '%'}`,
        ),
      )
      .limit(20);
  }
  return db
    .select()
    .from(recipeTags)
    .where(eq(recipeTags.familyId, familyId))
    .limit(20);
}

export async function ensureTags(familyId: string, names: string[]): Promise<void> {
  if (names.length === 0) return;
  for (const name of names) {
    await db.execute(
      sql`INSERT INTO recipe_tags (family_id, name) VALUES (${familyId}, ${name}) ON CONFLICT (family_id, name) DO NOTHING`,
    );
  }
}
