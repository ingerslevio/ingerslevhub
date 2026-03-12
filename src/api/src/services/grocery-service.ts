import { eq, and, ilike } from 'drizzle-orm';
import { db } from '../db/client.js';
import { groceryLists, groceryListItems, groceryProducts, mealPlans, meals, recipes } from '../db/schema.js';
import type { GroceryList, GroceryListItem, GroceryProduct } from '../db/schema.js';
import { getWeekStart } from './meal-service.js';

export async function getOrCreateList(userId: string, weekStart: string): Promise<GroceryList & { items: GroceryListItem[] }> {
  const mondayDate = getWeekStart(weekStart);
  const existing = await db.select().from(groceryLists)
    .where(and(eq(groceryLists.userId, userId), eq(groceryLists.weekStart, mondayDate)))
    .limit(1);

  let list: GroceryList;
  if (existing.length > 0) {
    list = existing[0]!;
  } else {
    const [created] = await db.insert(groceryLists).values({ userId, weekStart: mondayDate }).returning();
    list = created!;
  }

  const items = await db.select().from(groceryListItems).where(eq(groceryListItems.listId, list.id));
  return { ...list, items };
}

export async function addItem(listId: string, data: {
  name: string; productId?: string; quantity?: string; note?: string; buyOnDiscount?: boolean;
}): Promise<GroceryListItem> {
  const [item] = await db.insert(groceryListItems).values({
    listId,
    productId: data.productId ?? null,
    name: data.name,
    quantity: data.quantity ?? null,
    note: data.note ?? null,
    buyOnDiscount: data.buyOnDiscount ?? false,
    checked: false,
  }).returning();
  return item!;
}

export async function updateItem(id: string, data: Partial<{
  name: string; quantity: string; note: string; buyOnDiscount: boolean; checked: boolean;
}>): Promise<GroceryListItem> {
  const [item] = await db.update(groceryListItems).set(data).where(eq(groceryListItems.id, id)).returning();
  if (!item) throw new Error('Item not found');
  return item;
}

export async function deleteItem(id: string): Promise<void> {
  const result = await db.delete(groceryListItems).where(eq(groceryListItems.id, id)).returning();
  if (result.length === 0) throw new Error('Item not found');
}

export async function generateFromMealPlan(userId: string, weekStart: string, listId: string): Promise<void> {
  const mondayDate = getWeekStart(weekStart);
  // Get the meal plan for this week
  const planRows = await db.select().from(mealPlans)
    .where(and(eq(mealPlans.userId, userId), eq(mealPlans.weekStart, mondayDate)))
    .limit(1);
  if (planRows.length === 0) return;

  const plan = planRows[0]!;
  // Get meals with recipes for this plan
  const mealRows = await db.select({ meal: meals, recipe: recipes })
    .from(meals)
    .leftJoin(recipes, eq(meals.recipeId, recipes.id))
    .where(eq(meals.mealPlanId, plan.id));

  // Extract all ingredients
  const allIngredients: { name: string; quantity: string; unit: string }[] = [];
  for (const row of mealRows) {
    if (row.recipe?.ingredients) {
      try {
        const ings = JSON.parse(row.recipe.ingredients);
        if (Array.isArray(ings)) allIngredients.push(...ings);
      } catch { /* ignore invalid JSON */ }
    }
  }

  // Get existing items to avoid duplicates
  const existingItems = await db.select({ name: groceryListItems.name })
    .from(groceryListItems)
    .where(eq(groceryListItems.listId, listId));
  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

  for (const ing of allIngredients) {
    if (!ing.name || existingNames.has(ing.name.toLowerCase())) continue;

    // Upsert product into catalog
    let product = await db.select().from(groceryProducts)
      .where(and(eq(groceryProducts.userId, userId), ilike(groceryProducts.name, ing.name)))
      .limit(1);

    if (product.length === 0) {
      const [newProduct] = await db.insert(groceryProducts).values({
        userId,
        name: ing.name,
        defaultUnit: ing.unit || null,
      }).returning();
      product = [newProduct!];
    }

    const quantity = [ing.quantity, ing.unit].filter(Boolean).join(' ') || null;
    await db.insert(groceryListItems).values({
      listId,
      productId: product[0]!.id,
      name: ing.name,
      quantity,
      checked: false,
      buyOnDiscount: false,
    });
    existingNames.add(ing.name.toLowerCase());
  }
}

export async function searchProducts(userId: string, query: string): Promise<GroceryProduct[]> {
  if (!query) return [];
  return db.select().from(groceryProducts)
    .where(and(eq(groceryProducts.userId, userId), ilike(groceryProducts.name, `%${query}%`)))
    .limit(10);
}
