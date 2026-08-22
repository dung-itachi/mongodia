/**
 * Session cache for `getCurrentUser`.
 *
 * Lưu trữ kết quả resolve (employee + role + permissions) cho mỗi JWT
 * trong một Map in-memory với TTL ngắn (30s) để giảm 3-4 round-trips
 * MongoDB trên mỗi request lặp lại.
 *
 * Trade-off:
 *  - Nếu admin thay đổi permissions của user, user phải đợi tối đa 30s
 *    để thấy thay đổi. Acceptable cho app nội bộ.
 *  - Map chỉ tồn tại trong process Node.js — khi restart hoặc deploy
 *    cache tự động bị xóa (đây là hành vi mong muốn).
 *
 * Lưu ý bảo mật:
 *  - Key là SHA-256 hash của token, không lưu raw token.
 *  - Map không bao giờ được serialize ra ngoài process.
 */

import { createHash } from "node:crypto";

export interface CachedSession {
  employee: unknown;
  role: unknown;
  permissions: string[];
  expiresAt: number;
}

const SESSION_TTL_MS = 30_000;
const MAX_ENTRIES = 500;

declare global {
  // eslint-disable-next-line no-var
  var __sessionCache: Map<string, CachedSession> | undefined;
}

const cache: Map<string, CachedSession> =
  globalThis.__sessionCache ?? new Map<string, CachedSession>();

globalThis.__sessionCache = cache;

function evictIfNeeded() {
  if (cache.size <= MAX_ENTRIES) return;
  // Đơn giản: xóa entry sớm nhất (FIFO không cần chính xác — chỉ cần tránh OOM).
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) cache.delete(firstKey);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getCachedSession(token: string): CachedSession | null {
  const key = hashToken(token);
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached;
}

export function setCachedSession(
  token: string,
  data: Omit<CachedSession, "expiresAt">,
): void {
  const key = hashToken(token);
  cache.set(key, {
    ...data,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  evictIfNeeded();
}

export function invalidateSession(token: string): void {
  cache.delete(hashToken(token));
}

/**
 * Test helper: xóa toàn bộ cache. Chỉ dùng trong unit test.
 */
export function __clearSessionCache(): void {
  cache.clear();
}
