---
name: responsive-ux-polish
description: Audit and improve the UI of any web project (React, Next.js, Vue, Svelte, Astro, plain HTML/CSS, server-rendered templates) so it works on phones, is easy to use, and looks like a considered product instead of generated output. Use this whenever the user asks to check the UI, make something responsive or mobile-friendly, fix layout on small screens, improve UX or usability, polish screens, review a form or flow, make the interface look less AI-generated or generic, or reports something that is cramped, broken on a phone, too small to tap, or hard to see, even if they never say "responsive". Runs a static scan and an optional real-browser viewport audit, fixes UI only, and delivers a verified git patch.
---

# Responsive UX polish

Make a web interface work on a phone first, read clearly, and look like one team built it on purpose. This is a UI skill: it changes how screens look, lay out and read. It does not change what they do.

## Ground rules

These exist because UI work is where small edits cause quiet breakage. Holding to them is what makes the result safe to merge.

1. **UI only.** Do not change API calls, payload shapes, form field names, schema keys, element ids, `data-testid` hooks, routes, auth behaviour, validation rules or analytics events. If a screen cannot be improved without a backend change, report that and stop at the boundary.
2. **Scope.** Work on the surfaces the user named and the components they use. If the user named one screen, fix it first, then say what else you saw. Before editing a component shared across areas of the product, find who else renders it; prefer adding an optional prop that defaults to the old behaviour over changing the default.
3. **Use the project's own system.** Colours, radius, spacing, type and components come from what the project already defines. No new colours, fonts or libraries. A new screen should be indistinguishable in style from an existing one.
4. **Smallest change that fixes the problem.** Do not rewrite a working component to restyle it. Reviewers have to read the diff, and every extra line is a place to be wrong.
5. **Keep security-shaped copy generic.** Sign-in, sign-up and recovery answer the same whether or not an account exists. Improve clarity, never specificity. `references/ux-playbook.md` lists what not to touch.
6. **Frameworks change.** Read the documentation for the installed version before touching routing, metadata, viewport, images or fonts. If the project ships agent notes (`AGENTS.md`, `CLAUDE.md`), read them first; they often point at docs inside `node_modules`.
7. **Say what you verified and what you did not.** If no browser was available, state that layout was checked by code and scan only.

## Workflow

### 0. Establish the audience

Everything below depends on who uses the product and on what device. If the user has not said, ask one short question, or state your assumption and continue. The safe default is mobile-first: a mid-range phone around 360px wide, one thumb, mobile data. For a desktop-heavy internal tool, weigh keyboard speed and density more, but nothing may break at narrow widths. See "Who you are designing for" in `references/responsive-playbook.md`.

### 1. Orient

```bash
python <skill>/scripts/detect_project.py [dir]
```

It reports the framework, styling approach, component library, theme and token files, route folders, the project's own `dev`/`build`/`lint`/`typecheck`/`test` scripts, agent notes, and, from a monorepo root, which package is the web app. Use what it finds: those scripts are your verification commands, and the token file is the source of truth for colour and spacing.

Then read the token file and the base components (button, input, card), and list the user-facing surfaces by reading the route folder. Review all of them.

### 2. Get a baseline

```bash
python <skill>/scripts/static_scan.py --json /tmp/ui-before.json
```

Run it from the web project folder. It needs no browser and takes a second. It flags patterns that break small screens (`100vh`, bare `grid-cols-3`, fixed pixel widths, raw tables, tiny text), touch and keyboard problems (small targets, a click handler on a `div`, `<button>` without `type`, removed focus outlines), a missing or zoom-blocking viewport tag, image costs, and AI tells (gradients, glass blur, emoji, stock marketing copy). It reads React, Vue, Svelte, Astro, HTML, template and CSS files. Every hit is a lead: open the file and read around it before deciding. The scan cannot see layout, so it also misses things.

If a browser is available, run the real audit. It opens each route at 320, 360, 390, 768 and 1280px and reports sideways scroll, controls under 44px, inputs under 16px (which make iOS zoom), tiny text, broken images and console errors, with a screenshot of each:

```bash
cd <web project> && npm i -D playwright && npx playwright install chromium
node <skill>/scripts/viewport_audit.mjs --base-url http://localhost:3000 --routes /,/pricing,/contact
```

Start the dev server with the project's own `dev` script first. For pages behind a login, use `--storage-state` with a saved Playwright session, or sign in with `--login-url` plus selectors and `AUDIT_USER` / `AUDIT_PASSWORD` in the environment (see the script header). Credentials stay out of the command line, shell history and the repo. Screenshots taken against a dev server show the framework's dev badge, and a blocked font host makes the page fall back to a system font; neither is a defect. In a sandbox with no browser or no network access to download one, skip this and say so.

### 3. Review each surface

For every screen, walk the five questions in `references/ux-playbook.md` ("How to review a screen"), then check it against `references/responsive-playbook.md` at 360px. Look specifically for:

- Anything that scrolls sideways, is cut off, or is hidden on small screens that a person needs.
- Primary action not visible, or not reachable with the keyboard open.
- Controls under 44px, tightly stacked links, hover-only affordances.
- Missing or weak loading, empty, error, success and busy states.
- Inputs without the right `type`, `inputMode`, `autocomplete`.
- Low contrast (muted text on a muted background), colour as the only signal, missing focus ring.
- Long real values: a 38-character surname, an ID with slashes, a file name with no spaces.
- Copy that is generic, upbeat or vague.

### 4. Write findings before fixing

List what you found, worst first, in this form so the user can judge each item quickly:

```
Issue:     what is wrong, where (file:line)
Severity:  Critical | High | Medium | Low
Fix:       the change, as a snippet when it is small
Why:       one line on what the user experiences
```

Severity means user impact, not code ugliness:
- **Critical**: the person cannot complete the task (control unreachable, form unusable, content unreadable, page broken).
- **High**: completing it needs zoom, sideways scroll or guesswork; failure leaves them stuck.
- **Medium**: friction, slowness or hard-to-read text, but they get through.
- **Low**: polish and consistency.

Keep the report honest. Do not inflate a Low to look thorough, and do not praise screens that are fine. If a screen is already good, write "no change" in one line.

### 5. Fix in order of harm

Breakage first (overflow, unreachable, unreadable), then usability (targets, input behaviour, states, feedback), then polish (hierarchy, spacing, copy). Stop when the next change would be taste, not need. Use the patterns in `references/responsive-playbook.md`, translated with `references/framework-notes.md` if the project is not Tailwind.

### 6. Make it read as made by a person

Do this pass last, on the diff you have produced, using `references/anti-ai-look.md`. It is mostly subtraction: remove decoration that has no reason, replace stock phrases with what actually happens, bring colour and radius back to the project's tokens. Then run its taste check for each screen you touched. Never add a flourish to pass the check; if a screen needs nothing, it needs nothing.

### 7. Verify

Use the project's own commands from step 1. Typically:

```bash
<pm> run typecheck        # or: npx tsc --noEmit
<pm> run lint             # or: npx eslint <changed files>
<pm> run build            # when the environment allows
python <skill>/scripts/static_scan.py --compare /tmp/ui-before.json
```

- Type check clean. Lint shows no new errors (pre-existing warnings are not yours to fix).
- The scan comparison shows your targeted rules falling and nothing new appearing.
- If you added a public route, confirm any auth middleware or route allow-list includes it.
- If a browser was available, re-run the viewport audit and compare. Look at the screenshots yourself rather than trusting the numbers alone; the audit finds overflow and size problems, not ugliness.
- A build can fail in a sandbox for reasons unrelated to your change (blocked font host, missing environment variables). Say so rather than hiding it, and do not claim a build passed that you did not run.

### 8. Deliver as a patch

People apply changes with `git apply`, so hand over a patch rather than pasted code.

```bash
sh <skill>/scripts/make_patch.sh <name>.patch      # from inside the git repo
```

The script writes the diff (excluding `*.tsbuildinfo`) and proves it applies to a clean checkout of `HEAD`. If an earlier patch from the same conversation is already applied in the user's tree, commit that state first so the new patch is relative to it, and say which patch it builds on. Outside a git repository, the script's header gives a `diff -ruN` fallback.

Then give a short summary: what was wrong, what changed, what you could not verify, and anything left that needs a backend or product decision. Name files by name; no preamble, no self-congratulation.

## References

| File | Read it when |
|---|---|
| `references/responsive-playbook.md` | Fixing layout, sizing, tables, forms, dialogs, images or touch targets, or deciding who you are designing for. |
| `references/ux-playbook.md` | Reviewing a flow, writing states or copy, adjusting for an audience, or unsure what you must not change. |
| `references/anti-ai-look.md` | Doing the final pass, or when the user says it looks generic or machine-made. |
| `references/framework-notes.md` | The project is not Tailwind, or you need framework-specific notes (viewport, images, fonts, component-library size props). |

| Script | Use |
|---|---|
| `scripts/detect_project.py` | First, to learn the stack, scripts and web app location. |
| `scripts/static_scan.py` | Baseline and after-comparison; no browser needed. |
| `scripts/viewport_audit.mjs` | Real-browser audit at several widths with screenshots; needs Playwright. |
| `scripts/make_patch.sh` | Final patch, verified against a clean checkout. |
