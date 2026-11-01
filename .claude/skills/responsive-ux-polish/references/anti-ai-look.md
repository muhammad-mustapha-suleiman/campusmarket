# Making it read as built by a person

Contents: why interfaces look machine-made · find the identity first · the tells · what to do instead · copy before and after · taste check

People cannot always say why a generated interface feels generated, but they feel it. It comes from defaults applied everywhere with no decision behind them: the same rounded card, the same gradient, the same centred hero, the same upbeat sentence. A human team makes a few deliberate choices, repeats them consistently, and leaves the rest plain.

## Find the identity first

Do not impose a style. Read the one that is already there:

- The theme or token file (CSS variables, `@theme`, `tailwind.config`, a `theme.ts`): the colour roles, radius, spacing, type scale, shadows.
- The existing base components (button, input, card, badge) and how pages compose them.
- The logo, the brand colours, the tone of the existing copy.
- The most polished screen already in the product. Match that.

New screens should be indistinguishable in style from the best existing screen. If the project has no identity (no tokens, one-off styles everywhere), make a small set of decisions and write them down in the theme file: one accent colour, one neutral scale, one radius, two font weights, one spacing rhythm. Then apply them everywhere. Consistency is what reads as human.

## The tells

**Visual**
- Gradient fills, gradient text, glowing blobs, glassmorphism (`backdrop-blur` over a tinted panel).
- A stock purple, indigo or blue palette on a product whose brand is something else.
- Everything `rounded-2xl` or `rounded-3xl`, everything `shadow-lg`.
- Icons inside tinted circles above every heading.
- Pill badges on everything.
- Emoji used as icons or as emphasis.
- Decorative looping animation (bouncing, pulsing), fade-up on every section.

**Layout**
- Everything centred, including paragraphs and form labels.
- A row of three identical cards: icon, bold title, grey sentence.
- A hero with a big headline, a subline and two buttons, on a screen that is really a form.
- Boxes inside boxes inside boxes. Containers used where spacing and a hairline rule would do.
- The same padding and gap everywhere, so nothing groups and nothing stands apart.

**Copy**
- "Welcome back!", "Get started", "Seamless", "Unlock", "Effortless", "Empower", "Your journey".
- Sentences that praise the product instead of telling the person what to do.
- Exclamation marks. Rhetorical questions as headings.
- Generic helper text ("Enter your details below") that adds nothing.
- Placeholder data that looks invented: round numbers, "John Doe", "Lorem".

**Code-level giveaways that show on screen**
- Utility strings that stack five decorations on one element.
- `transition-all` and hover scale on cards that are not clickable.
- One-off hex values or default grey classes beside the project's tokens.

## What to do instead

1. **Use the system you have.** Colours from tokens, radius from the token, the existing components. If you need something new, build it from those parts so it looks like it belongs.
2. **Make hierarchy with size, weight and space,** before reaching for a container. A heading, a gap and a hairline divider organise a section as well as a card does, with less noise.
3. **Align left.** Left-aligned text with a consistent left edge is how forms and records are read. Centre only short, isolated things: a logo, an empty-state message, a single confirmation.
4. **Vary density on purpose.** A record is compact: tight rows. A form needs air around the fields. Different content, different spacing; the contrast tells the eye where to go.
5. **Spend colour sparingly.** The accent for the one main action and for current state. Everything else neutral. If everything is accented, nothing is.
6. **Icons only where they carry meaning.** A trash icon on delete, a paperclip on attachments. Not a decorative icon above each section title.
7. **Motion answers the person's action.** A button pressing, a panel opening, a field accepting input. Nothing moves by itself, and anything that does respects `prefers-reduced-motion`.
8. **Write from the user's side.** Say what is happening and what to do next, in the words your users already use.
9. **Judge the design with real content.** A 38-character surname, an ID with slashes, an empty list, a record with no attachments, an error. Layouts that only work with tidy sample data are the generated ones.
10. **Leave things plain when plain is right.** Not every screen needs a flourish. A sign-in screen is a form; make it a good form.

## Copy before and after

| Generic | Specific |
|---|---|
| Welcome back! Sign in to continue your journey. | Sign in to your account. |
| Get started | Create your account |
| Something went wrong. Please try again. | We could not send the message. Check your connection and try again. |
| Enter your details below | Use the name on your card. |
| Submit | Send request |
| No data available | You have no orders yet. When you place one it will show up here. |
| Success! Your changes have been saved. | Address updated. |
| Seamlessly manage your finances | Your accounts and recent transactions. |

Where a screen touches account existence (sign-in, recovery, sign-up) the generic wording is deliberate security behaviour. Improve its clarity, not its specificity. See `ux-playbook.md`.

## Taste check before you hand over

Answer honestly for each screen you touched.

1. Could I say, in one sentence, why each decorative element is there? If not, remove it.
2. Is every colour, radius and font something the project already defines?
3. Squint at the screen: is there one obvious place to look, and is it the main action?
4. Is there any sentence a user would skip because it says nothing?
5. Does it still work with the longest real name, the emptiest list and the worst error?
6. Would this sit next to the existing screens without looking like it came from a different team?

If the first or last is a "no", revise before delivering.
