/**
 * Constants shared between the SSE auth helper (server-only) and the
 * AuthProvider (client-only). This file MUST NOT import anything that
 * depends on Node-only modules (mongoose, fs, etc.) so that it can be
 * safely imported from a client component.
 */

export const SSE_TOKEN_COOKIE = "notification-stream-token";
