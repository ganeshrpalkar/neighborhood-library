/**
 * Centralized API endpoint paths.
 *
 * Every request path used by `src/lib/api.ts` lives here so routes are defined
 * once and never hardcoded at call sites. Paths are relative to `API_URL`
 * (the axios `baseURL`), mirroring the REST surface in CLAUDE.md.
 */
export const ENDPOINTS = {
  auth: {
    register: "/auth/register",
    token: "/auth/token",
    me: "/auth/me",
  },
  books: {
    root: "/books",
    autocomplete: "/books/autocomplete",
    detail: (id: number) => `/books/${id}`,
    cover: (id: number) => `/books/${id}/cover`,
  },
  members: {
    root: "/members",
    autocomplete: "/members/autocomplete",
    detail: (id: number) => `/members/${id}`,
    loans: (id: number) => `/members/${id}/loans`,
  },
  loans: {
    root: "/loans",
    detail: (id: number) => `/loans/${id}`,
    return: (id: number) => `/loans/${id}/return`,
  },
} as const;
