export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  selectedCalendarId?: string
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

export interface MealPlan {
  id: string
  userId: string
  weekStart: string
  meals: Meal[]
}

export interface Meal {
  id: string
  mealPlanId: string
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  mealType: 'breakfast' | 'lunch' | 'dinner'
  title: string
  notes?: string
  recipeId?: string
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

export interface Recipe {
  id: string
  userId: string
  name: string
  description?: string
  ingredients: { name: string; quantity: string; unit: string }[]
  instructions?: string
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
  createdAt: string
}

export interface GroceryProduct {
  id: string
  userId: string
  name: string
  defaultUnit?: string
  category?: string
}

export interface GroceryList {
  id: string
  userId: string
  weekStart: string
  items: GroceryListItem[]
}

export interface GroceryListItem {
  id: string
  listId: string
  productId?: string
  name: string
  quantity?: string
  note?: string
  buyOnDiscount: boolean
  checked: boolean
}
