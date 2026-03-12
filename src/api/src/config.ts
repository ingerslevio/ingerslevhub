import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  GOOGLE_CLIENT_ID: requireEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: requireEnv('GOOGLE_CLIENT_SECRET'),
  GOOGLE_REDIRECT_URI: requireEnv('GOOGLE_REDIRECT_URI'),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  API_PORT: parseInt(process.env['API_PORT'] ?? '3001', 10),
  FRONTEND_URL: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
} as const;

export type Config = typeof config;
