---
name: nextjs-app-router-conventions
description: Conventions for building or refactoring Next.js (App Router) projects the recommended way - pages are server components that fetch data and render HTML (SSR), and only interactive pieces (forms, modals, buttons, filters) are small client components inserted into them. Use this skill whenever the user is starting a new Next.js system, dashboard, admin panel, CRUD app or hospital/shop/CRM-style project, adds or refactors a page, mentions server components, client components, 'use client', SSR, App Router, searchParams, loading/error states, or Next.js auth with cookies - even if they only say "build me a system" with a Next.js frontend. Also use it when reviewing Next.js code that has 'use client' at the top of page.tsx or layout.tsx.
---

# Next.js App Router conventions

The goal is a project where **pages are server components by default**, so the first HTML already contains real data, and **client components are small islands** that exist only because they need the browser. This is what the Next.js docs recommend, and it gives smaller bundles, no loading waterfalls, and no secrets in the browser.

The user's backend is often NestJS (a separate REST API). Treat that API as the source of truth for permissions: the Next.js layer hides UI and renders data, it never replaces the API's guards.

## The rules

1. **`page.tsx` and `layout.tsx` are server components.** Never put `'use client'` in them. If a page "needs" it, extract the interactive part instead.
2. **Add `'use client'` only to files that use** state/effects/refs, event handlers, browser APIs (`window`, `localStorage`, `document`), or client-only hooks (`useRouter`, `usePathname`, `useSearchParams`, context). Make the file as small as possible, and push it down to the leaf (a button, a modal, a filter), not the whole table.
3. **Fetch on the server.** An `async` page calls `serverApi()` directly. No `useEffect` + `fetch`, no `useList`-style hooks for page data. Run independent requests together with `Promise.all`.
4. **Mutations happen in client islands**, which call the API and then `router.refresh()` so the server page re-renders with fresh data (see `assets/lib/use-action.ts`). Server Actions are an equally valid choice for new code; pick one style per project.
5. **State that changes the result lives in the URL** (`?q=&status=&page=`): search, filters, pagination, tabs. The server page reads `searchParams`, so results are bookmarkable and need no client state (see `assets/components/UrlFilters.tsx`).
6. **Modals are client components** (they need the browser: Escape key, focus, form state). Whatever opens them is a client island too; the page around them stays on the server.
7. **Props crossing server -> client must be serializable**: strings, numbers, booleans, plain objects/arrays. No functions, class instances or JSX-returning callbacks. So a server `PageHeader` cannot receive `onAction={() => ...}`; give it a slot (`extra={<AddButton />}`) where the client component is rendered. Pass only the fields the island needs, not whole API payloads.
8. **Colocate.** Page-specific client code lives next to the page in a private folder: `app/(dashboard)/patients/_components/patient-actions.client.tsx`. Truly shared UI goes in `components/ui/`. The `.client.tsx` suffix makes the boundary visible in file listings.
9. **Shared presentational components carry no directive** (tables, badges, panels, empty states) so they work in both worlds. Only add `'use client'` to a shared component if it uses hooks or handlers.
10. **Server-only code imports `server-only`** (`import 'server-only'`) so a client import fails at build time instead of leaking cookies or internal URLs.

## Page anatomy

Copy `assets/example-list-page/` as the starting point for any list/CRUD page. The shape is always:

```tsx
export default async function PatientsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();        // cached per request, see below
  if (!user) return null;                     // layout is refreshing the session
  const params = await searchParams;          // a Promise in Next 15+
  const q = searchTerm(params.q);             // validate URL input before it reaches the API
  const data = await serverApi<Paginated<Patient>>('/patients', { query: { page: pageNumber(params.page), limit: 15, q } });
  return (<>
    <PageHeader title="Patients" extra={user.role === 'ADMIN' && <AddPatientButton />} />
    <ListPanel toolbar={<SearchFilter />}> …server-rendered table…
      <td><PatientRowActions patient={patient} /></td>   {/* client island per row */}
    </ListPanel>
    <LinkPagination data={data} hrefFor={hrefBuilder({ q })} />
  </>);
}
```

Always validate URL input: use `oneOf(value, ALLOWED)` for enums such as status, `pageNumber` for pages, and `searchTerm` for text. Never forward raw `searchParams` to the API.

## Authentication with HttpOnly cookies

SSR only works if the server can identify the user, and a client-side auth gate defeats it: a client layout that returns "Loading..." until the browser fetches `/auth/me` means the server HTML never contains page content. Use the server-first pattern in `assets/app/` and `assets/lib/`:

- `lib/server-api.ts`: server fetch client that forwards the request cookies to the API, throws `ServerApiError(status)`, supports a `query` option, and defaults to `cache: 'no-store'` for user-specific data.
- `lib/session.ts`: `getSessionUser()` wrapped in React `cache()`, so the root layout, dashboard layout and page share one `/auth/me` call per request. It returns `null` on 401.
- Root layout is an `async` server component: `const user = await getSessionUser()` then `<AuthProvider key={user?.id ?? 'anonymous'} initialUser={user}>`. The provider takes `initialUser` and does not refetch on mount; the `key` remounts it when the session changes.
- Dashboard layout (server): no user means render `<SessionRefresh />`; otherwise render `<AuthRedirect />` plus the shell. `SessionRefresh` (client) rotates the refresh token in the browser and calls `router.refresh()`, because server components cannot set cookies and refresh cookies are usually path-scoped to the API. **Guard it with a ref**: rotating refresh tokens treat a second concurrent call (React strict mode runs effects twice) as a replay and may sign the user out everywhere.
- After login or logout, call `router.refresh()` so server components re-render with the new cookie.
- The access cookie must reach the Next.js server: same host or a shared `COOKIE_DOMAIN`, and an internal API URL env var (`API_INTERNAL_URL`) for server-to-server calls.
- Redirect logged-in users away from `/login` in the **server** page (`redirect('/')`), not in an effect.
- Route guard file naming depends on the version: `middleware.ts` (export `middleware`) in Next 14/15, `proxy.ts` (export `proxy`) in Next 16. Check the installed version first; a wrongly named file silently does nothing.

## Loading, errors, not found

- Add `loading.tsx` at each route-group level (instant skeleton on navigation) and `error.tsx` (client component with a retry button calling `reset`). Server fetch failures then show one clean error screen instead of a half-rendered page.
- Use `notFound()` when a detail page's record does not exist.

## Rendering pitfalls to design around

- **Time zones and locales.** The server runs in UTC; the browser runs in the user's zone. Format dates with an explicit `timeZone` (for example the hospital's zone) in the shared formatter, otherwise times differ between server and client and hydration warns. Apply the same rule to `greeting()`-style helpers that read `getHours()`.
- **`cookies()` / `headers()` / `searchParams` make a route dynamic.** That is expected for authenticated apps; do not fight it with `force-static`.
- **`useSearchParams()` in a client component** requires a `<Suspense>` boundary on statically rendered routes. Reading `searchParams` in the server page and passing a string prop avoids this.
- **Debounced inputs** that write to the URL must ignore their initial mount call and skip no-op updates, or they will reset pagination on load.
- **Single-use tokens** (email verification, reset links) are run once from a client effect guarded by a ref, with the token passed in from the server page as a prop.
- **Environment variables.** Anything without the `NEXT_PUBLIC_` prefix stays on the server. Browser code uses `NEXT_PUBLIC_API_URL`; server code uses an internal URL.

## Building a new system: workflow

1. Confirm the Next.js version (`searchParams` is async from 15; route guard filename differs in 16) and the API's auth style.
2. Scaffold the shared layer from `assets/`: `lib/{server-api,session,search-params,use-action}.ts`, `components/ui/{UrlFilters,LinkPagination}.tsx`, auth components, and the three layouts. Adapt names and types; keep the structure.
3. For each resource, create the page + `_components/*-actions.client.tsx` pair from `assets/example-list-page/`.
4. Keep `components/ui` primitives directive-free except those with hooks (`Modal`, `SearchBox`, `UrlFilters`).
5. Do not create parallel copies of pages (for example `components/pages/*.client.tsx` mirroring `app/`); one implementation per route.

## Verify before delivering

Run all three; type-checking alone does not catch a function prop crossing the boundary.

1. `tsc --noEmit` (or the project's `typecheck` script).
2. `next build`. Server/client boundary errors surface here, and every route should show as dynamic (`ƒ`) when cookies are read.
3. SSR smoke test: start a tiny mock of the API, `next start`, then `curl -H 'Cookie: <access cookie>=t' localhost:PORT/<page>` and `grep` the HTML for a known row. Check that filters arrive at the API as query params, and that no-cookie requests do not leak data.

When refactoring an existing project, also list what changed in behaviour (error placement, filter persistence, anything removed as dead code) so the user can review it.

## Reference

`references/refactor-checklist.md` has a step-by-step checklist for converting an existing all-client app, including how to find the right files to delete.
