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

const AULA_CLIENT_ID = '_99949a54b8b65423862aac1bf629599ed64231607a';

export function buildAuthUrl(redirectUri: string, codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: AULA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'aula-sensitive',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://login.aula.dk/simplesaml/module.php/oidc/authorize.php?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: AULA_CLIENT_ID,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  const res = await fetch('https://login.aula.dk/simplesaml/module.php/oidc/token.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Aula token exchange failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}
