import axios from 'axios'
import type { User, MealPlan, Meal, HomeworkTask, Student, CalendarEvent, Recipe, GroceryList, GroceryListItem, GroceryProduct, GroceryCategory, RecipeTag, AulaToken, ApiKey, Todo, RecurringTodo } from '@/types'


const client = axios.create({
  baseURL: '',
  withCredentials: true,
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface CreateTaskInput {
  studentId: string
  subjectId?: string
  title: string
  description?: string
  dueDate?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  dueDate?: string
  completed?: boolean
  subjectId?: string
}

export interface CreateEventInput {
  title: string
  description?: string
  start: string
  end: string
}

export interface UpdateEventInput {
  title?: string
  description?: string
  start?: string
  end?: string
}

export const api = {
  auth: {
    async me(): Promise<User> {
      const { data } = await client.get('/api/auth/me')
      return data
    },
    async logout(): Promise<void> {
      await client.post('/api/auth/logout')
    },
    async changePassword(data: { currentPassword?: string; newPassword: string; confirmPassword: string }): Promise<void> {
      await client.put('/api/auth/password', data)
    },
    async loginWithPassword(email: string, password: string): Promise<User> {
      const { data } = await client.post('/api/auth/password', { email, password })
      return data
    },
  },
  admin: {
    async listUsers(): Promise<User[]> {
      const { data } = await client.get('/api/admin/users')
      return data
    },
    async createUser(input: { email: string; name: string; password?: string; role?: string }): Promise<User> {
      const { data } = await client.post('/api/admin/users', input)
      return data
    },
    async updateUser(id: string, input: { approved?: boolean; role?: string; name?: string; password?: string }): Promise<User> {
      const { data } = await client.patch(`/api/admin/users/${id}`, input)
      return data
    },
    async deleteUser(id: string): Promise<void> {
      await client.delete(`/api/admin/users/${id}`)
    },
    async listApiKeys(): Promise<ApiKey[]> {
      const { data } = await client.get('/api/admin/api-keys')
      return data
    },
    async createApiKey(input: { name: string; userId: string }): Promise<ApiKey> {
      const { data } = await client.post('/api/admin/api-keys', input)
      return data
    },
    async deleteApiKey(id: string): Promise<void> {
      await client.delete(`/api/admin/api-keys/${id}`)
    },
  },
  meals: {
    async getWeek(date: string): Promise<MealPlan> {
      const { data } = await client.get('/api/meals/week', { params: { date } })
      return data
    },
    async add(input: { dayOfWeek: string; mealType: string; title: string; mealPlanId: string; recipeId?: string; personCount?: number }): Promise<Meal> {
      const { data } = await client.post('/api/meals', input)
      return data
    },
    async update(id: string, input: { title?: string; notes?: string; rating?: number | null; personCount?: number | null; recipeId?: string | null }): Promise<Meal> {
      const { data } = await client.put(`/api/meals/${id}`, input)
      return data
    },
    async delete(id: string): Promise<void> {
      await client.delete(`/api/meals/${id}`)
    },
  },
  homework: {
    async list(params?: { student?: string; completed?: boolean }): Promise<HomeworkTask[]> {
      const { data } = await client.get('/api/homework', { params })
      return data
    },
    async create(input: CreateTaskInput): Promise<HomeworkTask> {
      const { data } = await client.post('/api/homework', input)
      return data
    },
    async update(id: string, input: UpdateTaskInput): Promise<HomeworkTask> {
      const { data } = await client.put(`/api/homework/${id}`, input)
      return data
    },
    async delete(id: string): Promise<void> {
      await client.delete(`/api/homework/${id}`)
    },
    async getStudents(): Promise<Student[]> {
      const { data } = await client.get('/api/homework/students')
      return data
    },
    async createStudent(input: { name: string; grade?: string; color?: string }): Promise<Student> {
      const { data } = await client.post('/api/homework/students', input)
      return data
    },
  },
  calendar: {
    async getEvents(start: string, end: string): Promise<CalendarEvent[]> {
      const { data } = await client.get('/api/calendar/events', { params: { start, end } })
      return data
    },
    async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
      const { data } = await client.post('/api/calendar/events', input)
      return data
    },
    async updateEvent(id: string, input: UpdateEventInput): Promise<CalendarEvent> {
      const { data } = await client.put(`/api/calendar/events/${id}`, input)
      return data
    },
    async deleteEvent(id: string): Promise<void> {
      await client.delete(`/api/calendar/events/${id}`)
    },
    async listCalendars(): Promise<unknown[]> {
      const { data } = await client.get('/api/calendar/calendars')
      return data
    },
    async selectCalendar(calendarId: string): Promise<void> {
      await client.put('/api/calendar/calendars/select', { calendarId })
    },
    async selectCalendars(calendarIds: string[]): Promise<void> {
      await client.put('/api/calendar/calendars/select', { calendarIds })
    },
  },
  recipes: {
    async list(): Promise<Recipe[]> {
      const { data } = await client.get('/api/recipes')
      return data
    },
    async get(id: string): Promise<Recipe> {
      const { data } = await client.get(`/api/recipes/${id}`)
      return data
    },
    async create(input: Partial<Recipe> & { name: string }): Promise<Recipe> {
      const { data } = await client.post('/api/recipes', input)
      return data
    },
    async update(id: string, input: Partial<Recipe>): Promise<Recipe> {
      const { data } = await client.put(`/api/recipes/${id}`, input)
      return data
    },
    async delete(id: string): Promise<void> {
      await client.delete(`/api/recipes/${id}`)
    },
    async listTags(q?: string): Promise<RecipeTag[]> {
      const { data } = await client.get(`/api/recipes/tags${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      return data
    },
  },
  groceries: {
    async getList(): Promise<GroceryList> {
      const { data } = await client.get('/api/groceries/list')
      return data
    },
    async addItem(_listId: string, input: { name: string; productId?: string; quantity?: string; note?: string; buyOnDiscount?: boolean; categoryId?: string | null }): Promise<GroceryListItem> {
      const { data } = await client.post('/api/groceries/list/items', input)
      return data
    },
    async updateItem(id: string, input: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean; categoryId: string | null }>): Promise<GroceryListItem> {
      const { data } = await client.put(`/api/groceries/items/${id}`, input)
      return data
    },
    async deleteItem(id: string): Promise<void> {
      await client.delete(`/api/groceries/items/${id}`)
    },
    async clearBought(): Promise<void> {
      await client.delete('/api/groceries/list/clear-bought')
    },
    async generateFromMealPlan(): Promise<void> {
      await client.post('/api/groceries/list/generate')
    },
    async searchProducts(q: string): Promise<GroceryProduct[]> {
      const { data } = await client.get('/api/groceries/products', { params: { q } })
      return data
    },
    async listCategories(): Promise<GroceryCategory[]> {
      const { data } = await client.get('/api/groceries/categories')
      return data
    },
    async createCategory(input: { name: string; color?: string; sortOrder?: number }): Promise<GroceryCategory> {
      const { data } = await client.post('/api/groceries/categories', input)
      return data
    },
    async updateCategory(id: string, input: Partial<{ name: string; sortOrder: number; color: string }>): Promise<GroceryCategory> {
      const { data } = await client.patch(`/api/groceries/categories/${id}`, input)
      return data
    },
    async deleteCategory(id: string): Promise<void> {
      await client.delete(`/api/groceries/categories/${id}`)
    },
    async addItemsFromMeal(data: {
      mealId: string
      items: Array<{ name: string; quantity?: string; unit?: string; productId?: string; categoryId?: string; recipeId?: string }>
    }): Promise<GroceryListItem[]> {
      const { data: result } = await client.post('/api/groceries/list/items/from-meal', data)
      return result
    },
    async updateProduct(id: string, input: { name?: string; categoryId?: string | null }): Promise<GroceryProduct> {
      const { data } = await client.patch(`/api/groceries/products/${id}`, input)
      return data
    },
  },
  todos: {
    async list(done?: boolean): Promise<Todo[]> {
      const { data } = await client.get('/api/todos', { params: done !== undefined ? { done: String(done) } : {} })
      return data
    },
    async create(input: { title: string; description?: string; dueDate?: string; priority?: 'low'|'medium'|'high'; tags?: string[]; assignedTo?: string }): Promise<Todo> {
      const { data } = await client.post('/api/todos', input)
      return data
    },
    async update(id: string, input: Partial<{ title: string; description: string | null; dueDate: string | null; priority: 'low'|'medium'|'high'; done: boolean; tags: string[]; assignedTo: string | null }>): Promise<Todo> {
      const { data } = await client.put(`/api/todos/${id}`, input)
      return data
    },
    async delete(id: string): Promise<void> {
      await client.delete(`/api/todos/${id}`)
    },
    async listRecurring(): Promise<RecurringTodo[]> {
      const { data } = await client.get('/api/todos/recurring')
      return data
    },
    async createRecurring(input: { title: string; description?: string; frequency: 'daily'|'weekly'|'monthly'|'custom'; intervalDays?: number; priority?: 'low'|'medium'|'high'; tags?: string[]; assignedTo?: string; firstDueDate?: string }): Promise<RecurringTodo> {
      const { data } = await client.post('/api/todos/recurring', input)
      return data
    },
    async deleteRecurring(id: string): Promise<void> {
      await client.delete(`/api/todos/recurring/${id}`)
    },
  },
  aula: {
    async getToken(): Promise<AulaToken | null> {
      try {
        const { data } = await client.get('/api/aula/token')
        return data
      } catch {
        return null
      }
    },
    async saveToken(accessToken: string, refreshToken?: string): Promise<void> {
      await client.post('/api/aula/token', { accessToken, refreshToken })
    },
    async deleteToken(): Promise<void> {
      await client.delete('/api/aula/token')
    },
    async verifyToken(): Promise<{ valid: boolean; profile?: unknown }> {
      const { data } = await client.get('/api/aula/token/verify')
      return data
    },
  },
}
