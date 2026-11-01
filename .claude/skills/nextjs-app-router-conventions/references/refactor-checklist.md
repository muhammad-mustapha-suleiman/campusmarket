# Converting an all-client Next.js app to server-first

Work in this order; each step leaves the app working.

1. **Find the problem files.** `grep -rln "'use client'" app` and look for `page.tsx` / `layout.tsx` hits. Also look for duplicate implementations (`diff` the page against any `components/pages/*.client.tsx`) and for files nothing imports.
2. **Add the shared layer** (`server-api`, `session`, `search-params`, `use-action`, `UrlFilters`, `LinkPagination`).
3. **Make the auth path server-first**: root layout reads the session, the provider accepts `initialUser`, the dashboard layout is a server component with `SessionRefresh` + `AuthRedirect`. Do this before any page, otherwise pages render behind a client-side loading gate and gain nothing.
4. **Convert one page** end to end (start with a simple list) and check it in the browser and with `curl`.
5. **Split each remaining page** into:
   - server `page.tsx`: fetch, table markup, role checks that only decide what to render
   - `_components/*.client.tsx`: add/edit/delete buttons, row actions, modals, forms
   - URL filters instead of `useState` for search/status/page
6. **Convert the public pages** (login, forgot/reset password, verify email): server shell with the `AuthCard`, a client form component, tokens read from `searchParams` and passed as props.
7. **Fix boundary violations as they appear.** `onAction={() => ...}` on a server header becomes a slot prop; callbacks become client components; whole API objects become the few fields needed.
8. **Pin the time zone** in shared date formatters.
9. **Delete dead code** only after confirming with `grep` that nothing imports it, and tell the user what was deleted. Do not delete unrelated files just because they fail to compile; report them instead.
10. **Verify** with typecheck, `next build`, and the curl smoke test (see SKILL.md).
11. **Deliver as a patch** if the user asked: commit the baseline, commit your changes, `git diff --binary base HEAD > change.patch`, then verify `git apply --check` on a pristine copy and that the result matches your tree.

Gotcha when verifying: if you move files aside to get a build passing, restore them in the same command, and check `git status` before generating the patch so the patch does not delete them.
