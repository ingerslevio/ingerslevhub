import { eq, and, ilike, isNull, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  groceryLists,
  groceryListItems,
  groceryProducts,
  groceryCategories,
  mealPlans,
  meals,
  recipes,
} from '../db/schema.js';
import type {
  GroceryList,
  GroceryListItem,
  GroceryProduct,
  GroceryCategory,
} from '../db/schema.js';

export async function getOrCreateActiveList(
  userId: string,
): Promise<GroceryList & { items: GroceryListItem[] }> {
  const existing = await db
    .select()
    .from(groceryLists)
    .where(and(eq(groceryLists.userId, userId), isNull(groceryLists.weekStart)))
    .limit(1);

  let list: GroceryList;
  if (existing.length > 0) {
    list = existing[0]!;
  } else {
    const [created] = await db
      .insert(groceryLists)
      .values({ userId, weekStart: null })
      .returning();
    list = created!;
  }

  const items = await db
    .select()
    .from(groceryListItems)
    .where(eq(groceryListItems.listId, list.id));
  return { ...list, items };
}

export async function addItem(
  listId: string,
  data: {
    name: string;
    productId?: string;
    quantity?: string;
    note?: string;
    buyOnDiscount?: boolean;
  },
): Promise<GroceryListItem> {
  // Upsert product into catalog
  let resolvedProductId: string | null = data.productId ?? null;

  if (!resolvedProductId) {
    // Try to find product by name for the list's user
    const list = await db
      .select({ userId: groceryLists.userId })
      .from(groceryLists)
      .where(eq(groceryLists.id, listId))
      .limit(1);

    if (list.length > 0) {
      const userId = list[0]!.userId;
      const existing = await db
        .select()
        .from(groceryProducts)
        .where(and(eq(groceryProducts.userId, userId), ilike(groceryProducts.name, data.name)))
        .limit(1);

      if (existing.length > 0) {
        resolvedProductId = existing[0]!.id;
      } else {
        const [newProduct] = await db
          .insert(groceryProducts)
          .values({ userId, name: data.name })
          .returning();
        resolvedProductId = newProduct!.id;
      }
    }
  }

  const [item] = await db
    .insert(groceryListItems)
    .values({
      listId,
      productId: resolvedProductId,
      name: data.name,
      quantity: data.quantity ?? null,
      note: data.note ?? null,
      buyOnDiscount: data.buyOnDiscount ?? false,
      checked: false,
    })
    .returning();
  return item!;
}

export async function updateItem(
  id: string,
  data: Partial<{
    quantity: string;
    note: string;
    buyOnDiscount: boolean;
    checked: boolean;
  }>,
): Promise<GroceryListItem> {
  const updateData: Record<string, unknown> = { ...data };

  if (data.checked === true) {
    updateData.checkedAt = new Date();
    // Update product lastBoughtAt
    const currentItem = await db
      .select({ productId: groceryListItems.productId })
      .from(groceryListItems)
      .where(eq(groceryListItems.id, id))
      .limit(1);
    if (currentItem.length > 0 && currentItem[0]!.productId) {
      await db
        .update(groceryProducts)
        .set({ lastBoughtAt: new Date() })
        .where(eq(groceryProducts.id, currentItem[0]!.productId));
    }
  } else if (data.checked === false) {
    updateData.checkedAt = null;
  }

  const [item] = await db
    .update(groceryListItems)
    .set(updateData)
    .where(eq(groceryListItems.id, id))
    .returning();
  if (!item) throw new Error('Item not found');
  return item;
}

export async function deleteItem(id: string): Promise<void> {
  const result = await db
    .delete(groceryListItems)
    .where(eq(groceryListItems.id, id))
    .returning();
  if (result.length === 0) throw new Error('Item not found');
}

export async function clearBought(listId: string): Promise<void> {
  await db
    .delete(groceryListItems)
    .where(and(eq(groceryListItems.listId, listId), eq(groceryListItems.checked, true)));
}

export type GroceryProductWithCategory = Omit<GroceryProduct, 'category'> & {
  category: GroceryCategory | null;
};

export async function searchProducts(
  userId: string,
  query: string,
): Promise<GroceryProductWithCategory[]> {
  if (!query) return [];
  const rows = await db
    .select({ product: groceryProducts, category: groceryCategories })
    .from(groceryProducts)
    .leftJoin(groceryCategories, eq(groceryProducts.categoryId, groceryCategories.id))
    .where(and(eq(groceryProducts.userId, userId), ilike(groceryProducts.name, `%${query}%`)))
    .limit(10);
  return rows.map((r) => {
    const { category: _oldCategory, ...rest } = r.product;
    return { ...rest, category: r.category ?? null };
  });
}

export async function listCategories(userId: string): Promise<GroceryCategory[]> {
  return db
    .select()
    .from(groceryCategories)
    .where(eq(groceryCategories.userId, userId))
    .orderBy(asc(groceryCategories.sortOrder));
}

export async function createCategory(
  userId: string,
  data: { name: string; color?: string },
): Promise<GroceryCategory> {
  const [category] = await db
    .insert(groceryCategories)
    .values({ userId, name: data.name, color: data.color ?? '#6366f1' })
    .returning();
  return category!;
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; sortOrder: number; color: string }>,
): Promise<GroceryCategory> {
  const [category] = await db
    .update(groceryCategories)
    .set(data)
    .where(eq(groceryCategories.id, id))
    .returning();
  if (!category) throw new Error('Category not found');
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  await db.delete(groceryCategories).where(eq(groceryCategories.id, id));
}

export async function updateProductCategory(
  productId: string,
  categoryId: string | null,
): Promise<GroceryProduct> {
  const [product] = await db
    .update(groceryProducts)
    .set({ categoryId })
    .where(eq(groceryProducts.id, productId))
    .returning();
  if (!product) throw new Error('Product not found');
  return product;
}

export async function generateFromMealPlan(
  userId: string,
  weekStart: string,
  listId?: string,
): Promise<void> {
  // Get the meal plan for this week
  const planRows = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.userId, userId), eq(mealPlans.weekStart, weekStart)))
    .limit(1);
  if (planRows.length === 0) return;

  const plan = planRows[0]!;

  // Resolve target list
  let targetListId = listId;
  if (!targetListId) {
    const active = await getOrCreateActiveList(userId);
    targetListId = active.id;
  }

  // Get meals with recipes for this plan
  const mealRows = await db
    .select({ meal: meals, recipe: recipes })
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
  const existingItems = await db
    .select({ name: groceryListItems.name })
    .from(groceryListItems)
    .where(eq(groceryListItems.listId, targetListId));
  const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

  for (const ing of allIngredients) {
    if (!ing.name || existingNames.has(ing.name.toLowerCase())) continue;

    // Upsert product into catalog
    let product = await db
      .select()
      .from(groceryProducts)
      .where(and(eq(groceryProducts.userId, userId), ilike(groceryProducts.name, ing.name)))
      .limit(1);

    if (product.length === 0) {
      const [newProduct] = await db
        .insert(groceryProducts)
        .values({ userId, name: ing.name, defaultUnit: ing.unit || null })
        .returning();
      product = [newProduct!];
    }

    const quantity = [ing.quantity, ing.unit].filter(Boolean).join(' ') || null;
    await db.insert(groceryListItems).values({
      listId: targetListId,
      productId: product[0]!.id,
      name: ing.name,
      quantity,
      checked: false,
      buyOnDiscount: false,
    });
    existingNames.add(ing.name.toLowerCase());
  }
}
