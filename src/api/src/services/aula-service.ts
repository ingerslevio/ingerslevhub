import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { aulaTokens } from '../db/schema.js';
import type { AulaToken } from '../db/schema.js';

export async function getToken(userId: string): Promise<AulaToken | null> {
  const rows = await db
    .select()
    .from(aulaTokens)
    .where(eq(aulaTokens.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertToken(
  userId: string,
  accessToken: string,
  refreshToken?: string | null,
  expiresAt?: Date | null,
): Promise<AulaToken> {
  const existing = await getToken(userId);
  if (existing) {
    const rows = await db
      .update(aulaTokens)
      .set({
        accessToken,
        refreshToken: refreshToken ?? existing.refreshToken,
        expiresAt: expiresAt ?? existing.expiresAt,
        updatedAt: new Date(),
      })
      .where(and(eq(aulaTokens.userId, userId), eq(aulaTokens.id, existing.id)))
      .returning();
    return rows[0]!;
  }
  const rows = await db
    .insert(aulaTokens)
    .values({
      userId,
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt: expiresAt ?? null,
    })
    .returning();
  return rows[0]!;
}

export async function deleteToken(userId: string): Promise<void> {
  await db.delete(aulaTokens).where(eq(aulaTokens.userId, userId));
}

export async function verifyToken(accessToken: string): Promise<{ valid: boolean; profile?: unknown }> {
  try {
    const res = await fetch(
      `https://www.aula.dk/api/v22/?method=profiles.getprofilesbylogin&access_token=${encodeURIComponent(accessToken)}`,
    );
    const data = await res.json() as { status?: string; data?: unknown };
    return { valid: res.ok && data?.status === 'ok', profile: data?.data };
  } catch {
    return { valid: false };
  }
}
