# Framework and library notes

Contents: plain CSS equivalents · Tailwind versions · Next.js · other frameworks · component libraries · server-rendered templates

Look up the exact APIs for the version installed. Frameworks change, and some projects ship their own agent notes (`AGENTS.md`, `CLAUDE.md`) pointing at documentation inside `node_modules`. If one exists, read the relevant page before touching routing, metadata, viewport, images or fonts.

## Plain CSS equivalents

| Goal | CSS |
|---|---|
| Full-height page that fits phones | `min-height: 100vh; min-height: 100dvh;` (fallback line first) |
| Never wider than the screen | `width: 100%; max-width: 40rem;` |
| Text container inside flex/grid does not overflow | `min-width: 0;` on the child |
| Long unbroken strings wrap | `overflow-wrap: anywhere;` |
| Fluid type without breakpoints | `font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);` |
| Columns that collapse by themselves | `grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));` |
| Bottom bar clear of the home indicator | `padding-bottom: max(1rem, env(safe-area-inset-bottom));` |
| Respect reduced motion | `@media (prefers-reduced-motion: reduce) { * { animation: none; transition: none; } }` |
| Keep a visible focus ring | `:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }` |
| Tap target with a small icon | `min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;` |
| Component adapts to its container, not the screen | `container-type: inline-size;` then `@container (min-width: 30rem) { ... }` |

## Tailwind

- `dvh` height utilities (`h-dvh`, `min-h-dvh`) exist from v3.4. On older versions use `min-h-[100dvh]`.
- v4 configures through CSS (`@theme` in your stylesheet) and has container queries built in (`@container`, `@sm:`). v3 needs the container-queries plugin.
- Safe areas are not built in: use arbitrary values such as `pb-[env(safe-area-inset-bottom)]`.
- `motion-reduce:` and `focus-visible:` variants are built in. Prefer them to hand-written media queries.
- Prefix order matters for mobile-first: write the base (phone) style unprefixed, then `sm:`, `md:`, `lg:` for larger screens.
- Colours and radii should come from the theme (`bg-primary`, `rounded-lg`), not from arbitrary hex values.

## Next.js

- The viewport tag is set through the framework's viewport export (recent versions) or a `<meta>` in older ones. `viewportFit: "cover"` enables safe-area insets. Check the docs for the installed version.
- `next/image`: `priority` preloads the image. Use it only for the above-the-fold image that is visible at every width. Always give `sizes` for responsive layouts. A priority image inside a parent that is hidden on phones is downloaded for nothing.
- `next/font` downloads fonts at build or dev time; if the network blocks Google Fonts, a dev server falls back to a system font and a production build can fail. That is an environment limit, not a code bug.
- `loading` and `error` files apply to their own route segment and the segments below it, so check what each segment shows while it loads or fails.
- `next dev` shows a small dev badge in a corner of screenshots. Ignore it.

## Other frameworks

- **Vite / plain React SPA:** the viewport meta lives in `index.html`.
- **Vue / Nuxt:** viewport and head tags through `app.head` or `useHead`; check for `user-scalable=no`.
- **SvelteKit:** `src/app.html`.
- **Astro:** the shared layout's `<head>`; client-side islands load later, so give their space a fixed size to avoid shifting.
- **Angular:** `BreakpointObserver` from the CDK for logic; keep layout in CSS where you can.
- **Remix / React Router:** loading states belong in the route's pending UI.

## Component libraries

Use the library's own responsive tools and size props, not raw CSS fighting its styles.

- **MUI:** responsive values in `sx` (`{ xs: ..., md: ... }`), `Grid` breakpoint props. The `size="small"` and dense variants of buttons, fields and tables are usually under 44px.
- **Chakra:** responsive arrays or objects on style props; `size="sm"` and `xs` controls are small.
- **Bootstrap:** `col-12 col-md-6` grid, `.table-responsive`; `.btn-sm` and `.form-control-sm` are under 44px.
- **Ant Design:** `Grid` with `xs`/`md` props, `Table` with `scroll={{ x: true }}`; its `small` size is well under 44px.
- **shadcn/ui (Radix + Tailwind):** you own the component source; adjust sizes there, and check who else uses a component before changing its default.

## Server-rendered templates

Rails, Django, Laravel (Blade), Twig, Liquid, Nunjucks and similar follow the same rules. The scanner reads `.erb`, `.twig`, `.njk`, `.hbs`, `.liquid` and `.blade.php` files. Put the viewport tag in the base layout once, keep CSS in one stylesheet, and test with a real browser because the scanner cannot run templates.
