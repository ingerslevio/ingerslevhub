import { pgTable, text, uuid, timestamp, boolean, date, integer, real } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: text('google_id').unique(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  apiKey: uuid('api_key').default(sql`gen_random_uuid()`).notNull(),
  selectedCalendarId: text('selected_calendar_id'),
  selectedCalendarIds: text('selected_calendar_ids').default('[]').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  role: text('role').default('user').notNull(),
  passwordHash: text('password_hash'),
  approved: boolean('approved').default(false).notNull(),
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  grade: text('grade'),
  color: text('color').default('#6366f1').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  color: text('color').default('#6366f1').notNull(),
});

export const mealPlans = pgTable('meal_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  weekStart: date('week_start').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const meals = pgTable('meals', {
  id: uuid('id').primaryKey().defaultRandom(),
  mealPlanId: uuid('meal_plan_id').references(() => mealPlans.id, { onDelete: 'cascade' }).notNull(),
  dayOfWeek: text('day_of_week', { enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }).notNull(),
  mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner'] }).notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  rating: integer('rating'),
  personCount: integer('person_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const homeworkTasks = pgTable('homework_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  ingredients: text('ingredients').notNull().default('[]'),
  instructions: text('instructions'),
  prepTimeMinutes: integer('prep_time_minutes'),
  cookTimeMinutes: integer('cook_time_minutes'),
  servings: integer('servings'),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  tags: text('tags').default('[]').notNull(),
  ratingSum: real('rating_sum').default(0).notNull(),
  ratingCount: integer('rating_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groceryCategories = pgTable('grocery_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  color: text('color').default('#6366f1').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groceryProducts = pgTable('grocery_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  defaultUnit: text('default_unit'),
  category: text('category'),
  categoryId: uuid('category_id').references(() => groceryCategories.id, { onDelete: 'set null' }),
  lastBoughtAt: timestamp('last_bought_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groceryLists = pgTable('grocery_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  weekStart: date('week_start'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groceryListItems = pgTable('grocery_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id').references(() => groceryLists.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => groceryProducts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  quantity: text('quantity'),
  note: text('note'),
  buyOnDiscount: boolean('buy_on_discount').default(false).notNull(),
  checked: boolean('checked').default(false).notNull(),
  checkedAt: timestamp('checked_at'),
  mealId: uuid('meal_id').references(() => meals.id, { onDelete: 'set null' }),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => groceryCategories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recipeTags = pgTable('recipe_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  key: uuid('key').default(sql`gen_random_uuid()`).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type NewMealPlan = typeof mealPlans.$inferInsert;
export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type HomeworkTask = typeof homeworkTasks.$inferSelect;
export type NewHomeworkTask = typeof homeworkTasks.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type GroceryCategory = typeof groceryCategories.$inferSelect;
export type NewGroceryCategory = typeof groceryCategories.$inferInsert;
export type GroceryProduct = typeof groceryProducts.$inferSelect;
export type NewGroceryProduct = typeof groceryProducts.$inferInsert;
export type GroceryList = typeof groceryLists.$inferSelect;
export type NewGroceryList = typeof groceryLists.$inferInsert;
export type GroceryListItem = typeof groceryListItems.$inferSelect;
export type NewGroceryListItem = typeof groceryListItems.$inferInsert;
export const aulaTokens = pgTable('aula_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type RecipeTag = typeof recipeTags.$inferSelect;
export type NewRecipeTag = typeof recipeTags.$inferInsert;
export type AulaToken = typeof aulaTokens.$inferSelect;
export type NewAulaToken = typeof aulaTokens.$inferInsert;

export const recurringTodos = pgTable('recurring_todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium').notNull(),
  tags: text('tags').default('[]').notNull(),
  assignedTo: text('assigned_to'),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'custom'] }).notNull(),
  intervalDays: integer('interval_days'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const todos = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium').notNull(),
  done: boolean('done').default(false).notNull(),
  doneAt: timestamp('done_at'),
  tags: text('tags').default('[]').notNull(),
  assignedTo: text('assigned_to'),
  recurringTodoId: uuid('recurring_todo_id').references(() => recurringTodos.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type RecurringTodo = typeof recurringTodos.$inferSelect;
export type NewRecurringTodo = typeof recurringTodos.$inferInsert;
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
