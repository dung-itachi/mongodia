/**
 * Shared request wrapper (Sprint 6.8).
 *
 * Thay vì mỗi hook tự viết wrapper `fetch`, dùng chung một hàm này để:
 *   - Tự gắn `Content-Type: application/json`.
 *   - Parse JSON và check `{ success, message, data }` shape.
 *   - Throw `Error(message)` chuẩn — message lấy từ backend (không hardcode).
 *
 * Khi project lên ~100 API endpoint, mọi hook đều nên dùng `request<T>()` này.
 */

export interface ApiOk<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErr {
  success: false;
  message: string;
}

export type ApiResult<T> = ApiOk<T> | ApiErr;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Body sẽ được `JSON.stringify` tự động. */
  body?: unknown;
}

export async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body:
      body === undefined || body === null
        ? undefined
        : typeof body === "string"
        ? body
        : JSON.stringify(body),
  });

  let payload: ApiResult<T>;
  try {
    payload = (await response.json()) as ApiResult<T>;
  } catch {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }

  return payload.data;
}

export default request;