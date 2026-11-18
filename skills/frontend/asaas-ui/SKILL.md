---
name: asaas-ui
description: Ayoub's Asaas front-end kit for React + Vite sites, in Arabic RTL with an English mode. It brings the Thmanyah typeface (Sans, Serif Display, Serif Text, with swash and extended-fatha features), the Asaas ink, gold and sand brand tokens with light and dark themes, liquid-glass components (cards, buttons, fields, modals, toasts, stat tiles, segmented control, pills, icons), a responsive site header with a phone menu and a bottom tab bar, and the floating Asaas-robot AI assistant chat widget. Use it whenever Ayoub (or anyone in this account) starts or restyles a website, web app, dashboard, landing page, admin panel or internal tool. Use it too when they ask for "نفس تصميم أساس", "نفس ستايل صندوق أساس", خط ثمانية, glass design, an Arabic/RTL interface or the Asaas assistant robot, even if they don't name the kit. Prefer it over generic styling for any new Asaas-branded front end.
---

# Asaas UI kit

The look of «صندوق أساس» (fund.ai-asaas.com), packaged so any new React + Vite site gets
the same identity in minutes: Thmanyah type, Asaas brand colours, liquid-glass surfaces,
right-to-left Arabic, light/dark themes, and the Asaas robot assistant.

Everything ships as source under `template/`. The install script copies it into the
project (`src/asaas-ui/`), where it belongs to that site and can be edited freely. There is
no package to version or publish.

## Set up a project

1. **Have a React + Vite + TypeScript project.** For a new one:
   `npm create vite@latest <name> -- --template react-ts` then `npm install`.
2. **Install the kit** (keeps existing files; add `--force` to overwrite):
   ```bash
   node "<this skill dir>/scripts/install.mjs" <project-dir>
   ```
   It copies `src/asaas-ui/` and `public/` (logo marks, favicon and `theme-init.js`). It makes
   `index.html` `lang="ar" dir="rtl"`, sets `viewport-fit=cover` so safe-area insets work on
   notched phones, and loads `/theme-init.js`, which applies the saved theme, language and
   direction before first paint. The script is an external file, not inline, so a strict
   Content Security Policy works. It imports `asaas-ui/styles/index.css` at the top of
   `main.tsx` and drops Vite's starter CSS.
3. **Wrap the app:** `<ToastProvider>` around everything, and `<Ambient />` once behind the
   content. Glass needs something to refract: without Ambient the surfaces look flat.
   ```tsx
   import { Ambient, ToastProvider } from './asaas-ui';
   createRoot(root).render(
     <StrictMode>
       <ToastProvider>
         <Ambient />
         <App />
       </ToastProvider>
     </StrictMode>,
   );
   ```
4. **Lay out the frame:** a `Layout` with `<SiteHeader brand nav actions />`, the page inside
   `<main className="container">`, and `<TabBar>` for apps with three to five sections (see
   the frontend skill's `references/patterns.md` for a full `Layout`).
5. **Delete Vite's demo** (`App.css`, the counter, `src/assets/react.svg`), then build pages
   from the kit. Check the page renders in the browser, in both themes and at phone width
   (375px).

Everything is exported from `src/asaas-ui/index.ts`. Read `references/components.md` for each
component's props and copy-ready snippets. Read `references/brand.md` before choosing colours,
type or wording. Read `references/assistant.md` before adding the AI assistant.

## Ground rules (why the kit looks the way it does)

- **RTL first, English ready.** The document is `dir="rtl"` by default and `dir="ltr"` in
  English. Use logical CSS (`margin-inline-start`, `padding-inline`, `inset-inline-end`), never
  `left`/`right` for layout; multiply by `--dir-x` to move along the reading direction.
  Forward and next point left: `chevronLeft` means "next" or "details", and `Icon` mirrors
  the chevrons by itself in English.
- **The kit's words follow the page language.** Built-in labels (close, cancel, retry,
  loading, password strength, status names, the assistant's texts) come from `kitText`, which
  reads `<html lang>`. Reword any of them with `setKitText('ar' | 'en', { … })`.
- **Three Thmanyah cuts, each with a job.** Sans is for the interface and **every number**.
  Serif Display is for headings (`h1`–`h3`, weight 700). Serif Text is for paragraphs and
  descriptions (`.prose` or `var(--font-text)`). Numbers stay in Sans even inside a heading:
  wrap them in `<span className="num">`.
- **Swash on titles, sparingly.** `<Swash>` gives the last letter of a title its swash form.
  Use it once per heading (page title, brand name, modal title) and never on two
  neighbouring words. `<Stretch>` draws the extended fatha («صبَــاح الخير»). It is for one
  greeting or hero word, not for body text.
- **Colour comes from tokens.** Use `var(--accent)`, `var(--text-2)`, `var(--paid)` and the
  other tokens, never hex values in components. That way dark mode works for free.
  `--paid`, `--partial` and `--unpaid` are reserved for state, and always come with an icon
  and a label (`<StatusPill>`), never colour alone.
- **Glass is the surface.** Group content in `<Card>` or `<Glass>`, on top of `<Ambient />`.
  Use `thick` for floating chrome (bars, panels) and `pill` for capsules.
- **Numbers read correctly in Arabic.** Use `formatNumber`, `formatMoney` and
  `formatSigned` from the kit. They use Latin digits with thousands separators, wrapped in
  bidi isolates so signs stay attached. The currency defaults to `ر.ي` (`CURRENCY` in
  `lib/format.ts`).
- **Arabic copy is short, warm and direct.** Write button labels as verbs («حفظ», «تسجيل
  مصروف»). Empty states say what to do next. Errors say what happened and how to fix it.
  Greet with the first name only (`firstName`, `greeting`).
- **Phones are first-class.** Pages sit in `.container` (`--page-max`, `--page-pad`), the
  header is `SiteHeader` (menu button at 900px and below), and apps add `TabBar`. The kit's
  breakpoints are 640px, 900px and 1080px: `grid--main` and `grid--halves` go to one column
  under 1080px, `grid--stats` goes to two columns on phones, long button labels wrap under
  640px, and chips scroll sideways. Check every page at 375px with no horizontal scroll.
  Tap targets stay at least 44px (`--tap`).

## Fonts licence

Thmanyah is licensed for embedding inside a packaged product (see
`src/asaas-ui/fonts/thmanyah/LICENSE-ar.pdf`). Keep the font files under `src/`, where Vite
bundles them with hashed names. Never move them to `public/`, which would serve them as
plain downloads. Before using the kit for someone else's site, make sure the licence covers
that site.

## What is not in the kit

- **A desktop sidebar** and auth screens. The kit gives the top header and the phone tab
  bar; a site that wants a sidebar builds it from `Glass thick` and hides it under 900px in
  favour of `TabBar`.
- **A language provider and dictionaries** for the site's own text. The site owns them (see
  the frontend skill); the kit only reads `<html lang>`.
- **Data fetching.** Use whatever the site needs (TanStack Query worked well in Asaas). The
  components only take props.
- **The assistant's server side.** It is described in `references/assistant.md`.

## Keeping the kit in sync

The kit was extracted from `C:\ayoub\asaas accounting\apps\web` (the Asaas fund). It now has
fixes the fund does not: `lib/i18n.ts`, `ui/SiteHeader.tsx`, `styles/shell.css`,
`public/theme-init.js`, logical CSS for English, mirrored chevrons and a focus-trapping
`Modal`. `scripts/assemble-from-fund.cjs` deletes `ui/`, `lib/`, `styles/` and `public/` and
copies the fund's files over them, so it refuses to run unless you pass
`--overwrite-kit-fixes`. Port those fixes to the fund first, then sync.
`template/src/asaas-ui/assistant/` is the general version written for the kit, so the script
leaves it alone.
