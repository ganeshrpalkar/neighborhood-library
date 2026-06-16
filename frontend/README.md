# Neighborhood Library — Frontend

A premium, animated, 3D-flavored library management UI built with Next.js 14 (App Router),
TypeScript, Tailwind CSS, Framer Motion, and react-three-fiber.

## Features

- Animated auth (login / register) with a live 3D scene
- Dashboard with a real-time 3D hero (orbiting books + starfield), animated stat counters, and recent loans
- Books: searchable, paginated grid; add / edit / delete; "Lend" flow that creates a loan
- Members: searchable, paginated grid; add / edit / delete; slide-in drawer showing a member's loans with a Return action
- Loans: status-filtered list (All / Active / Overdue / Returned) with Return action and a "New Loan" flow
- JWT auth stored in `localStorage`, route guard that redirects to `/login`, axios interceptor that injects the bearer token and handles 401s
- Glassmorphism dark theme, skeleton loaders, toasts, responsive layout with a mobile bottom nav

## Requirements

- Node.js 18.18+ (tested on Node 20)
- The FastAPI backend running at `http://localhost:8000`

## Setup

```bash
npm install
cp .env.local.example .env.local   # then edit if your API runs elsewhere
npm run dev                         # http://localhost:3000
```

### Environment

| Variable              | Default                          | Purpose                |
| --------------------- | -------------------------------- | ---------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1`   | Base URL of the API    |

If unset, the client falls back to `http://localhost:8000/api/v1`.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

## Structure

```
src/
├── app/                       # App Router pages
│   ├── layout.tsx             # Root layout (AuthProvider + Toaster)
│   ├── page.tsx               # Redirects to /dashboard or /login
│   ├── login/  register/      # Auth pages
│   ├── dashboard/             # 3D hero + stats + recent loans
│   ├── books/  members/  loans/
├── components/
│   ├── three/HeroScene.tsx    # react-three-fiber scene (dynamic import, ssr:false)
│   ├── layout/                # Sidebar, MobileNav, AppShell (auth guard), PageHeader
│   ├── ui/                    # Button, Input, Modal, Badge, Pagination, Skeleton, ...
│   ├── auth/ books/ members/ loans/   # feature components & modals
├── contexts/AuthContext.tsx   # JWT auth state
└── lib/
    ├── api.ts                 # axios instance + typed API functions + interceptors
    ├── types.ts               # API contract types
    ├── hooks.ts               # useDebounce
    └── cn.ts                  # className helper
```

## Notes

- The 3D scene uses `@react-three/fiber` + `@react-three/drei` and is loaded via
  `next/dynamic` with `ssr: false` to avoid server-side rendering of WebGL.
- All API calls go through `src/lib/api.ts`; error messages surface the backend's
  `msg` / `detail` fields in toasts.
