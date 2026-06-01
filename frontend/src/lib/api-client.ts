'use client';

import { obtenerSesion } from '@/lib/session';

/** Base URL — NEXT_PUBLIC_API_URL debe incluir /v1, ej: http://localhost:8000/api/v1 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const sesion = obtenerSesion();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(sesion ? { Authorization: `Bearer ${sesion.token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: `Error HTTP ${res.status}` }));
    throw new ApiError(
      res.status,
      body.message ?? `Error HTTP ${res.status}`,
      body,
    );
  }

  return res.json() as Promise<T>;
}
