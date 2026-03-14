export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  selectedCalendarId?: string
  selectedCalendarIds?: string
  role: string
  approved: boolean
  createdAt?: string
  passwordHash?: string | null
  apiKey?: string
}

export interface Student {
  id: string
  userId: string
  name: string
  grade?: string
  color: string
}

export interface Subject {
  id: string
  studentId: string
  name: string
  color: string
}

export interface RecipeIngredient {
  productId?: string
  name: string
  quantity?: string
  unit?: string
}

export interface RecipeTag {
  id: string
  name: string
}

export interface Recipe {
  id: string
  userId: string
  name: string
  description?: string
  ingredients: string  // JSON string of RecipeIngredient[]
  instructions?: string
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
  imageUrl?: string
  sourceUrl?: string
  tags: string[]        // parsed from JSON
  ratingSum: number
  ratingCount: number
  createdAt: string
  // enriched fields from listRecipes
  lastUsedAt?: string | null
  timesUsed?: number
  avgRating?: number | null
}

export interface Meal {
  id: string
  mealPlanId: string
  dayOfWeek: string
  mealType: string
  title: string
  notes?: string
  recipeId?: string | null
  rating?: number | null
  personCount?: number | null
  createdAt: string
  recipe?: Recipe | null   // enriched
}

export interface MealPlan {
  id: string
  userId: string
  weekStart: string
  createdAt: string
  updatedAt: string
  meals: Meal[]
}

export interface HomeworkTask {
  id: string
  studentId: string
  subjectId?: string
  title: string
  description?: string
  dueDate?: string
  completed: boolean
  completedAt?: string
  student?: Student
  subject?: Subject
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
}

export interface GroceryCategory {
  id: string
  userId: string
  name: string
  sortOrder: number
  color: string
}

export interface GroceryProduct {
  id: string
  userId: string
  name: string
  defaultUnit?: string
  category?: GroceryCategory | null
  categoryId?: string
  lastBoughtAt?: string
}

export interface GroceryList {
  id: string
  userId: string
  items: GroceryListItem[]
}

export interface AulaToken {
  accessToken: string
  refreshToken?: string | null
  expiresAt?: string | null
}

export interface GroceryListItem {
  id: string
  listId: string
  productId?: string | null
  name: string
  quantity?: string | null
  note?: string | null
  buyOnDiscount: boolean
  checked: boolean
  checkedAt?: string | null
  createdAt: string
  mealId?: string | null
  recipeId?: string | null
  categoryId?: string | null
  effectiveCategoryId?: string | null
  product?: {
    id: string
    name: string
    categoryId?: string | null
    category?: GroceryCategory | null
  } | null
  category?: GroceryCategory | null
}

export interface ApiKey {
  id: string
  userId: string
  name: string
  key: string
  createdAt: string
}

export interface FamilyMember {
  familyId: string
  userId: string
  role: string
  familyRole?: string
}

export interface Family {
  id: string
  name: string
  createdAt: string
  members: FamilyMember[]
}

export interface FamilyDetailMember {
  id: string
  userId: string
  role: string
  familyRole: string
  userName: string
  userEmail: string
}

export interface FamilyDetail {
  id: string
  name: string
  createdAt: string
  members: FamilyDetailMember[]
}

export interface Todo {
  id: string
  userId: string
  title: string
  description?: string | null
  dueDate?: string | null
  priority: 'low' | 'medium' | 'high'
  done: boolean
  doneAt?: string | null
  tags: string[]
  assignedTo?: string | null
  recurringTodoId?: string | null
  createdAt: string
}

export interface RecurringTodo {
  id: string
  userId: string
  title: string
  description?: string | null
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  assignedTo?: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  intervalDays?: number | null
  active: boolean
  createdAt: string
}
