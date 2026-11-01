# Responsive playbook

Contents: who you are designing for · widths to test · layout rules · patterns (page shell, tables, forms, sticky actions, dialogs, images) · typography and touch · before you call it done

Class names below are Tailwind. `framework-notes.md` gives the plain-CSS and other-library equivalents.

## Who you are designing for

Decide this before judging any layout. If the user has not said, ask one question about who uses the product and on what, or state your assumption and carry on.

The safe default is mobile-first: a mid-range phone, a 360px-wide screen, one thumb, mobile data, imperfect light. That is the situation of most people on most public-facing sites, and a layout that works there nearly always works everywhere else.

It is a default, not dogma. An internal tool used all day at a desk deserves keyboard speed and information density first. Even then, nothing may break (sideways scroll, clipped controls) at narrow widths, because people open links on phones.

## Widths to test

| Width | Why |
|---|---|
| 320 | Smallest phone still in use; also what a desktop browser at 400% zoom behaves like. Nothing may scroll sideways here. |
| 360 | The most common Android width. Design for this first. |
| 390-430 | Current iPhones. |
| 768 | Tablet portrait; larger phones in landscape. |
| 1024-1440 | Laptop and desktop. |

Also check landscape at about 640x360: with the on-screen keyboard open there is very little height, and a long form must still scroll to its submit button.

## Layout rules

- One column first. Add columns with breakpoints as space allows. A bare `grid-cols-3` is a bug at 320px.
- Page padding about `px-4` on phones, more above. Content sits in a `max-w-*` container with `mx-auto w-full`.
- Heights come from content. Use `dvh`, not `vh`: `vh` includes the browser's collapsing address bar, so a "full-height" page overflows by roughly the height of that bar.
- Flex and grid children that hold text need `min-w-0`, or one long value pushes the row wider than the screen. Emails, IDs, URLs and file names need `break-words` (or `overflow-wrap: anywhere` for strings with no spaces).
- Icons next to text need `shrink-0` so they do not squash.
- Do not hide information on small screens to make room. Reorder or stack it. Content hidden below a breakpoint does not exist for the person on a phone.
- Do not fix overflow with `overflow-x: hidden` on the body. It hides the symptom and clips content someone may need. Find the element that is too wide.

## Patterns

### Page shell with a decorative side panel

A split layout (form beside a hero image) is fine on a large screen. On a phone the image is decoration, so it must cost nothing.

- Do not mark the image high-priority (`priority` in Next.js, `fetchpriority="high"`, `loading="eager"`) when a parent hides it on small screens. A priority image is preloaded, so phones download it even though they never show it. Left lazy, browsers skip images inside `display: none`.
- Give it a `sizes` value that matches where it actually appears, for example `(min-width: 1024px) 50vw, 1px`.
- Keep a compact header on small screens so the brand is still visible.

### Tables become cards on phones

A table with five columns cannot work at 360px. Render the same data twice and switch by breakpoint:

```tsx
<ul className="space-y-3 md:hidden">
  {rows.map((row) => (
    <li key={row.id} className="rounded-xl border bg-card p-4">
      <p className="font-medium break-words">{row.title}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Status</dt>
        <dd>{row.status}</dd>
      </dl>
    </li>
  ))}
</ul>
<div className="hidden md:block">{/* the existing table */}</div>
```

Wrapping a table in `overflow-x-auto` stops it breaking the page, but scrolling a table sideways on a phone is a last resort, not a design. Keep the key column visible if you must scroll (a sticky first column).

### Forms

- Labels above fields, never placeholder-as-label. One column on phones.
- Every field gets the right `type`, `inputMode`, `autocomplete` and `enterKeyHint`. Phone: `type="tel" inputMode="tel" autocomplete="tel"`. Email: `type="email" autocomplete="email"`. New password: `autocomplete="new-password"`. One-time codes: `inputMode="numeric" autocomplete="one-time-code"`. Names and addresses have their own autocomplete tokens.
- Inputs are 16px or larger on phones, or iOS Safari zooms the page on focus and does not zoom back.
- Submit buttons are full width on phones and auto width above, unless the form is one short field.
- Show the error beside the field and move focus to the first invalid field on submit. A banner at the top of a long form is invisible once the person has scrolled.
- Keep what was typed when a request fails. Disable the button and change its label while a request is in flight, so a slow network cannot cause a double submit.

### Actions that must stay reachable

On long forms the submit button can sit below the keyboard. Where it matters:

```tsx
<div className="sticky bottom-0 -mx-4 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:p-0">
  <Button className="w-full sm:w-auto">Save</Button>
</div>
```

`env(safe-area-inset-bottom)` is generally zero on iPhones unless the viewport tag includes `viewport-fit=cover`. Check how your framework sets the viewport before relying on it.

### Dialogs and menus

A dialog must never be taller than the screen: `max-h-[85dvh] overflow-y-auto`, and `w-[calc(100%-2rem)]` on phones. Anything longer than a confirmation is better as a full-screen page or a bottom sheet on phones. Menus and popovers need to stay inside the viewport and be dismissible with a tap outside and with Escape.

### Images, media and uploads

- Reserve space (width/height or an aspect box) so nothing jumps when the image arrives. Serve sizes that match the layout.
- Video: no autoplay with sound; do not autoplay at all on metered connections.
- Uploads: `accept` the real types, state the size limit before the person picks a file, show progress and offer retry. Phone cameras produce 4-8 MB photos; say so if your limit is lower.

## Typography and touch

- Body text 16px on phones, line-height 1.5-1.6. Nothing a person must read goes below 12px; secondary metadata can be 13-14px.
- Line length 45-75 characters. A paragraph the full width of a laptop screen is hard to read; cap it (`max-w-prose`).
- Tap targets 44x44px at least, with about 8px between neighbours. The usual offenders are icon-only buttons, show/hide-password toggles, "Back" and "Resend" text links, tabs, checkboxes and pagination. A small icon can still have a large hit area through padding.
- Nothing may depend on hover. A control that only appears on hover does not exist on a phone.
- Respect `prefers-reduced-motion` for anything that moves without being asked to.

## Before you call it done

1. No sideways scroll at 320px on any route.
2. The first screen of each flow shows its primary action without scrolling at 360x640, or makes scrolling obvious.
3. Long names, emails, IDs and file names wrap instead of pushing the layout.
4. 200% browser zoom still works.
5. Focus order follows reading order and a focus ring is visible on every control.
6. Light and dark mode (if the product has both) read well, using the project's tokens rather than hard-coded colours.
