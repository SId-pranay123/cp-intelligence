# Step 10 — Frontend

## What was built

The complete Next.js frontend: auth page, setup page, dashboard with three sections, BFF API routes, and middleware for route protection. The JWT is stored in an httpOnly cookie and never exposed to browser JavaScript.

## Pages built

### /auth

Tab-switched form with Login and Register tabs. Register collects `email`, `username`, and `password`. Login collects `email` and `password`. Both call Next.js BFF routes (`/api/auth/register`, `/api/auth/login`) which proxy to NestJS and set the `cp_token` httpOnly cookie on success.

### /setup

Codeforces handle input form. Calls `POST /api/codeforces/handle` (proxied as `PUT` to NestJS), then `POST /api/sync`. On completion redirects to `/dashboard`.

### /dashboard

Server Component. Reads `cp_token` cookie on the server, fetches skill profile and recommendations in parallel, transforms the skill profile response shape, and passes data to three client/server components. No client-side data fetching waterfalls.

## Components built

### ProgressSection

Displays mastered / in-progress / not-started counts and average strength. A gradient progress bar spans the full width, divided into three color segments.

### WeaknessHeatmap

71 cells in a responsive grid, color-coded by strength:

| Strength | Color |
|---|---|
| No data | Gray |
| 0–19% | Red-950 |
| 20–39% | Red-800 |
| 40–59% | Yellow-700 |
| 60–79% | Green-700 |
| ≥ 80% | Green-500 |

Cells are grouped by the 10 concept groups. Tooltip shows concept name and exact strength on hover.

### DailyRecommendations

Up to 5 recommendation cards. Each card has: concept badge, problem title link, difficulty badge, AI reason (italic), and 5 confidence rating buttons. Clicking a rating button calls `POST /api/confidence` then `router.refresh()`.

### SyncButton

Client component with loading state. Calls `POST /api/sync`, shows a spinner, and displays the synced count on success. Calls `router.refresh()` to trigger a server-side re-fetch.

## BFF API routes

All routes in `app/api/`:

| Route | Proxies to |
|---|---|
| `POST /api/auth/login` | `POST /auth/login` (NestJS) |
| `POST /api/auth/register` | `POST /auth/register` (NestJS) |
| `POST /api/auth/logout` | deletes cookie, redirects |
| `POST /api/sync` | `POST /codeforces/sync` (NestJS) |
| `POST /api/confidence` | `POST /recommendations/confidence` (NestJS) |
| `POST /api/codeforces/handle` | `PUT /codeforces/handle` (NestJS) |

All routes read `cp_token` from the incoming cookie and attach it as `Authorization: Bearer` before forwarding.

## Middleware

`middleware.ts` protects routes before they reach handlers:

- `/dashboard/*`, `/setup/*` — redirect to `/auth` if `cp_token` absent
- `/auth` — redirect to `/dashboard` if `cp_token` present

## Bugs found and fixed

**1. Tailwind CSS v4 incompatibility with Next.js 14**

Tailwind v4 introduced a new CSS-based configuration system that is incompatible with the PostCSS plugin used by Next.js 14. Styles were not applied at all.

Fix: downgraded to `tailwindcss@^3`, restored `tailwind.config.ts` and `postcss.config.js`.

**2. Register form missing username field**

NestJS `POST /auth/register` requires `{ email, username, password }`. The initial form only sent `{ email, password }`, resulting in NestJS returning 400.

Fix: added username field to the register tab.

**3. Register redirect to /dashboard instead of /setup**

New users haven't set a CF handle yet. `/dashboard` with no data shows an empty state with no explanation.

Fix: changed register success redirect to `/setup`.

**4. CF handle regex rejected dots**

Handles like `pranay.2` were rejected by the NestJS DTO regex `^[a-zA-Z0-9_-]+$`.

Fix: updated regex to `^[a-zA-Z0-9_\-.]+$`.

**5. strengths null for new users**

`transformProfile()` iterated over `raw.concepts` without a null guard. New users have no concepts, so NestJS returns `{ concepts: [] }` — but before that fix, any null/undefined caused a runtime crash.

Fix: added `?? {}` fallback on the strengths object and `?? []` on the concepts array.

**6. Skill profile response shape mismatch**

NestJS returns `{ user_id: string, concepts: [{ concept_id, strength }] }`. The dashboard components expected `{ strengths: Record<string, number> }`.

Fix: added `getProfile()` transform that converts the NestJS response to the component-expected shape.

**7. /api/codeforces/handle route used POST instead of PUT**

NestJS registers `PUT /codeforces/handle`. The BFF proxy was calling it with `method: 'POST'`, resulting in 404.

Fix: changed the fetch call in the route handler to `method: 'PUT'`.

## What was verified

- Unauthenticated visit to `/dashboard` redirects to `/auth`
- Logged-in visit to `/auth` redirects to `/dashboard`
- Register with new email → redirects to `/setup` → CF handle set → sync runs → redirects to `/dashboard`
- Dashboard renders all three sections with real data
- WeaknessHeatmap shows correct colors for concepts at various strength levels
- SyncButton triggers a sync and dashboard updates without full page reload
- Confidence rating 1–5 updates heatmap on next render
- Logout deletes cookie and redirects to `/auth`
