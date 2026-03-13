import postgres from 'postgres';
import { config } from '../config.js';

const sql = postgres(config.DATABASE_URL);

export async function runMigrations() {
  console.log('Running migrations...');

  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      api_key UUID NOT NULL DEFAULT gen_random_uuid(),
      selected_calendar_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      grade TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
      day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
      meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
      title TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS homework_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL DEFAULT '[]',
      instructions TEXT,
      prep_time_minutes INTEGER,
      cook_time_minutes INTEGER,
      servings INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS grocery_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      default_unit TEXT,
      category TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS grocery_lists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS grocery_list_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
      product_id UUID REFERENCES grocery_products(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      note TEXT,
      buy_on_discount BOOLEAN NOT NULL DEFAULT FALSE,
      checked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_calendar_ids TEXT NOT NULL DEFAULT '[]'`;

  await sql`
    CREATE TABLE IF NOT EXISTS grocery_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE grocery_products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES grocery_categories(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE grocery_products ADD COLUMN IF NOT EXISTS last_bought_at TIMESTAMP`;

  await sql`ALTER TABLE grocery_list_items ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP`;

  await sql`ALTER TABLE grocery_lists ALTER COLUMN week_start DROP NOT NULL`;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS grocery_lists_active_uniq ON grocery_lists(user_id) WHERE week_start IS NULL`;

  await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS rating INTEGER`;
  await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS person_count INTEGER`;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT`;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT`;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '[]'`;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS rating_sum REAL NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE grocery_list_items ADD COLUMN IF NOT EXISTS meal_id UUID REFERENCES meals(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE grocery_list_items ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE grocery_list_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES grocery_categories(id) ON DELETE SET NULL`;
  await sql`
    CREATE TABLE IF NOT EXISTS recipe_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE`;
  // Approve existing users (they were created before this feature)
  await sql`UPDATE users SET approved = TRUE WHERE approved = FALSE`;
  // Make admin
  await sql`UPDATE users SET role = 'admin' WHERE email = 'emil@ingerslev.io'`;

  await sql`
    CREATE TABLE IF NOT EXISTS aula_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recurring_todos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      tags TEXT NOT NULL DEFAULT '[]',
      assigned_to TEXT,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
      interval_days INTEGER,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS todos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      done BOOLEAN NOT NULL DEFAULT FALSE,
      done_at TIMESTAMP,
      tags TEXT NOT NULL DEFAULT '[]',
      assigned_to TEXT,
      recurring_todo_id UUID REFERENCES recurring_todos(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log('Migrations complete.');
  await sql.end();
}

// Allow running directly: tsx src/db/migrate.ts
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
