# UX playbook

Contents: how to review a screen · surface types · states · copy · audience adjustments · accessibility floor · what not to change while improving UX

## How to review a screen

Walk it as the user would, at 360px, thumb only:

1. What is the one thing this person came to do here? Is it the most prominent thing on the screen?
2. Can they do it without reading anything they do not need?
3. What happens when it goes wrong (wrong input, no network, expired session, empty result)? Is the way out obvious?
4. What do they see while waiting?
5. After it works, do they know it worked and what happens next?

A screen that answers all five well rarely needs visual decoration.

## Take inventory first

Before changing anything, list the user-facing surfaces: read the route folder or router config, and open the product if it runs. Review all of them, not only the one mentioned. A fix to one screen that leaves its sibling inconsistent makes the product worse.

## Surface types and what to ask of each

| Surface | Ask |
|---|---|
| Sign-in and sign-up | Is the primary action obvious? Is recovery ("forgot password") reachable beside the field it relates to? Does it work with a password manager and autofill? Is the path for a first-time user clear? |
| Onboarding and multi-step flows | Which step is this, out of how many? Can they go back without losing input? Does each step ask only what it needs, and say why? |
| Long forms | Grouped logically? Errors beside fields? Draft preserved on failure? Submit reachable with the keyboard open? Optional fields clearly optional? |
| Lists and tables | Readable as cards on a phone? Sort, filter and search usable by thumb? Status shown in words as well as colour? Useful empty state? Paginated or lazy, not a thousand rows at once? |
| Detail and record views | Most-needed facts first? Values wrap? Actions that change the record separated from reading it? |
| Dashboards | What is the one number or task a person opens this for? Is it first? Charts readable at 360px, or replaced by a figure and a trend word? |
| Settings | Grouped by what people are trying to do, not by system component? Destructive actions separated and confirmed? Changes confirmed visibly? |
| Search | Input large, keyboard type right, results fast to scan, "no results" gives a next step? |
| Messaging and threads | Composer stays reachable with the keyboard open? Timestamps readable? Attachments openable on a phone? |
| Checkout and payments | Fewest fields possible, correct keyboards, totals always visible, errors specific, no surprises at the last step, double-submit prevented? |
| File upload | Limits stated first, progress shown, retry offered, camera/photo library both work on a phone? |
| Error and 404 pages | Says what happened in plain words and offers a way forward, not only "Go home"? |

Many products share a shell (layout, header, form primitives, buttons) between audiences, for example an admin area and a public area. Before editing a shared component, find who else renders it. Prefer adding an optional prop that defaults to the old behaviour over changing the default.

## States every screen needs

| State | Rule |
|---|---|
| Loading | A skeleton shaped like the content, not a spinner on a blank page. No layout shift when data arrives. |
| Empty | Say what belongs here and offer the next step. |
| Error | Say what happened in plain words, what the person can do, and offer retry. Never show a raw server message or status code. |
| Success | Confirm what changed and what comes next. A toast alone disappears; for a significant change also show it where the person lands. |
| Busy | Disable the submit control and change its label ("Sending..."). |
| Offline or slow | A request that fails because of the network says so and keeps the form filled. |
| Session expired | Return to sign-in, then back to where they were if that is cheap. |
| Partial | A list that loaded but one panel failed should show the rest and a retry for that panel. |

## Copy

- Write like a clear member of staff speaking to a customer: plain, direct, courteous, no slang, no exclamation marks, no marketing.
- Buttons are specific verbs: "Send code", "Create account", "Save changes". Not "Submit", "Continue", "Go".
- Error text names the problem and the fix: "That code has expired. Request a new one." Not "Something went wrong."
- Helper text answers the question the person is about to have, shown before the error, not after.
- Use the vocabulary the person already uses, not your internal names for things.
- Format dates, numbers and currency one way across the product, in the form the audience expects.
- Keep sentences short. Someone on a phone in poor light reads the first line and acts.

## Audience adjustments

Ask who is using this and adjust:

- **Slow or metered networks:** light pages, no autoplay, no large images above the fold, retry on every network action, forms that survive a dropped connection.
- **Limited reading comfort or a second language:** shorter sentences, common words, an icon next to text for key actions (never an icon alone), no idioms.
- **Older users or low vision:** larger base text, higher contrast, bigger targets than the minimum, no time-limited actions.
- **Shared or low-end devices:** avoid heavy animation and blur; keep JavaScript work off the first interaction.
- **Several languages:** text grows 30-40% in some languages and runs right-to-left in others. Do not size containers to the English string; use logical properties (`ms-`, `me-`, `ps-`, `pe-`) rather than left/right where the product may be localized. Do not hard-code strings if the project has a translation system; use it.

## Accessibility floor

Not optional, and cheap to hold from the start:

- Every control reachable and operable by keyboard, with a visible focus ring.
- Labels tied to inputs (`for` / `id`); errors announced (`role="alert"` or `aria-live`) and linked with `aria-describedby`.
- Colour is never the only signal. A status badge has text.
- Contrast at least 4.5:1 for body text and 3:1 for large text and control borders. Muted text on a muted background is the usual failure; check it.
- Icon-only buttons have an accessible name.
- One `h1` per page, headings in order; the page title says where you are.
- Pinch zoom is never blocked.

## Do not change while improving UX

These are the places where "better UX" quietly becomes a bug, a security hole, or a broken test.

- **Account-existence answers.** If the product has sign-in, sign-up or recovery, those flows should answer the same whether or not an account exists ("If an account exists, we've sent a code"). Never make the wording more specific, and never add "no account found" or "that email is registered" copy. Improve clarity, not specificity. The same goes for lockout messages.
- **Field names, ids, schema keys, `data-testid` hooks and API payloads.** Forms, tests and analytics depend on them. Restyle; do not rename.
- **Route guards and allow-lists.** A new public page may need adding to an auth middleware's public-route list, or signed-out visitors are redirected away from it.
- **What the API returns.** UI work does not need a backend change. If a screen cannot be improved without one, say so in the report and stop there.
- **Legal, consent, pricing and payment wording.** These are usually reviewed by someone else. Restyle them; do not rewrite them.
- **Analytics and event names** that dashboards depend on.
