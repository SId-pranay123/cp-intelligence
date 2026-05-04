// Server-side fetch helpers — always run in server components / route handlers.
// All requests forward the JWT from the httpOnly cookie.

const API = process.env.API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string>),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(path, token, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
