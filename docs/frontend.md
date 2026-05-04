# Frontend

## Overview

The Next.js frontend (`apps/web`) serves three pages: an auth page, a setup page for linking a Codeforces handle, and a dashboard. It acts as a Backend-for-Frontend (BFF) layer — API route handlers proxy requests to NestJS and manage the JWT token in an httpOnly cookie so it is never accessible to browser JavaScript.

## Technology Stack

- Next.js 14 (App Router)
- React 18 with Server Components
- TypeScript
- Tailwind CSS v3 (v4 is incompatible with Next.js 14 — see bugs section)
- `ioredis` indirectly (Redis handled server-side via NestJS)

## Pages

### /auth

A tab-switched form with Login and Register tabs.

**Register flow:**
- Fields: `email`, `username`, `password`
- Calls `POST /api/auth/register`
- On success: redirects to `/setup`

**Login flow:**
- Fields: `email`, `password`
- Calls `POST /api/auth/login`
- On success: redirects to `/dashboard`

Both flows go through Next.js BFF routes that set/read the `cp_token` httpOnly cookie.

### /setup

Collects the user's Codeforces handle and triggers the first sync.

1. User enters CF handle → `POST /api/codeforces/handle` (proxied to `PUT /codeforces/handle` in NestJS)
2. On handle acceptance → `POST /api/sync` (proxied to `POST /codeforces/sync`)
3. On sync completion → redirects to `/dashboard`

### /dashboard

A **Server Component** that runs on the Node.js server. It reads the `cp_token` cookie, then makes two parallel fetches to NestJS:

```typescript
const [profile, recommendations] = await Promise.all([
  getProfile(token),
  getRecommendations(token),
]);
```

The skill profile response from NestJS has shape `{ user_id, concepts: [{ concept_id, strength }] }`. The dashboard transforms this to `{ strengths: Record<string, number> }` before passing to child components:

```typescript
function transformProfile(raw: NestSkillProfile): { strengths: Record<string, number> } {
  const strengths: Record<string, number> = {};
  for (const c of raw.concepts ?? []) {
    strengths[c.concept_id] = c.strength;
  }
  return { strengths };
}
```

The `?? []` fallback handles new users who have no concepts yet.

The dashboard renders three sections:
- `<ProgressSection>` — overall skill summary
- `<WeaknessHeatmap>` — 71-cell grid
- `<DailyRecommendations>` — today's problem recommendations

## Components

### ProgressSection

Displays aggregate statistics computed from the strengths map:

| Metric | Definition |
|---|---|
| Mastered | Concepts with strength ≥ 60% |
| In progress | Concepts with strength > 0% and < 60% |
| Not started | Concepts with no data (strength = 0 or absent) |
| Avg strength | Mean of all known concept strengths |

Renders a gradient progress bar showing the mastered/in-progress/not-started proportions across the 71 total concepts.

### WeaknessHeatmap

A 71-cell grid, one cell per concept. Each cell is color-coded by strength:

| Strength range | Color |
|---|---|
| No data | Gray |
| < 20% | Red-950 (darkest red) |
| 20–39% | Red-800 |
| 40–59% | Yellow-700 |
| 60–79% | Green-700 |
| ≥ 80% | Green-500 (brightest green) |

Cells are arranged in the 10 concept groups defined in the knowledge graph. Hovering a cell shows the concept name and exact strength.

### DailyRecommendations

Renders up to 5 recommendation cards. Each card:

- **Concept badge** — concept name with color reflecting current strength
- **Problem title** — links directly to the Codeforces problem page
- **Difficulty badge** — `easy` / `medium` / `hard` / `expert` with distinct colors
- **AI reason** — italic text from Claude haiku explaining why this problem matters now
- **Confidence buttons** — 5 buttons labeled 1–5; clicking calls `POST /api/confidence` then `router.refresh()`

`router.refresh()` re-runs the server component on the current page, so the heatmap and progress section update without a full page reload.

### SyncButton

A client component rendered inside the dashboard header.

- Clicking calls `POST /api/sync`
- Shows a spinner while the request is in flight
- On success: displays "Synced N submissions" for a few seconds
- Calls `router.refresh()` to re-fetch the updated skill profile

## API Routes (BFF Layer)

All route handlers are in `apps/web/app/api/`. They read the `cp_token` cookie from the incoming request and forward it as a Bearer token to NestJS.

### POST /api/auth/login

```typescript
// Calls NestJS POST /auth/login
// On success: sets cp_token cookie and returns 200
cookies().set('cp_token', token, {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
});
```

### POST /api/auth/register

Same as login. Registers via NestJS `POST /auth/register` (requires `email`, `username`, `password`), then sets the cookie.

### POST /api/auth/logout

Deletes the `cp_token` cookie and redirects to `/auth`.

### POST /api/sync

Reads `cp_token`, calls `POST /codeforces/sync` on NestJS, returns `{ synced: N }`.

### POST /api/confidence

Reads `cp_token`, calls `POST /recommendations/confidence` on NestJS, forwards the `{ conceptId, confidence }` body.

### POST /api/codeforces/handle

Reads `cp_token`, proxies to `PUT /codeforces/handle` on NestJS. Note: NestJS uses `PUT`, not `POST`.

## Middleware

`apps/web/middleware.ts` intercepts all requests before they reach route handlers or pages:

```typescript
export const config = {
  matcher: ['/dashboard/:path*', '/setup/:path*', '/auth'],
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('cp_token');

  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/setup')) {
    if (!token) return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (request.nextUrl.pathname === '/auth') {
    if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | NestJS base URL (e.g. `http://localhost:3001`) |
| `NEXTAUTH_SECRET` | Not used — auth is managed via cp_token cookie |

## Bugs Found and Fixed

**1. Tailwind CSS v4 incompatibility**

Tailwind CSS v4 is incompatible with Next.js 14. Styles were not applied.

Fix: downgraded to `tailwindcss@^3` and restored the standard `tailwind.config.ts` + `postcss.config.js` setup.

**2. Register form missing username field**

NestJS `POST /auth/register` DTO requires `{ email, username, password }`. The initial form only sent `{ email, password }`, causing 400 errors.

Fix: added username field to the register form.

**3. Register redirect went to /dashboard instead of /setup**

After registration, users haven't linked a CF handle yet. Sending them to `/dashboard` showed an empty state with no explanation.

Fix: changed the register success redirect to `/setup`.

**4. CF handle regex rejected dots**

The handle validation DTO regex `^[a-zA-Z0-9_-]+$` rejected handles like `pranay.2`.

Fix: updated regex to `^[a-zA-Z0-9_\-.]+$` in the NestJS DTO.

**5. strengths returned as null for new users**

New users have no concept data. NestJS returned `{ concepts: [] }` but the transform code did not guard against `null`/`undefined`, causing a runtime error.

Fix: added `?? {}` fallback: `const strengths = transformProfile(raw) ?? {}`.

**6. Skill profile response shape mismatch**

NestJS returns `{ user_id, concepts: [{ concept_id, strength }] }` but the dashboard originally expected `{ strengths: Record<string, number> }` directly.

Fix: added `getProfile()` transform function that converts the NestJS response shape to the format the components expect.

**7. NestJS handle endpoint is PUT, not POST**

The `/api/codeforces/handle` BFF route was proxying as `POST` but NestJS registered the route as `PUT /codeforces/handle`.

Fix: updated the proxy fetch call to use `method: 'PUT'`.
