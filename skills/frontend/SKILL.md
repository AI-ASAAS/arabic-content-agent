---
name: frontend
description: Design, create, or extend maintainable ASAAS front ends with React, Vite and TypeScript, in Arabic RTL with an optional English version, built phone-first. Use for new websites, web apps, dashboards or admin panels, new pages and components, responsive or mobile layout fixes, styling, forms, data loading, sign-in, translation, accessibility, or front-end structure reviews. Pair it with the asaas-ui task skill for the visual kit.
---

# Frontend Foundation

## Goal

Build fast, accessible, easy-to-change front ends that look like ASAAS, work on a phone first, read correctly in Arabic (and in English when asked for), and stay simple enough for any developer or AI agent to continue.

## Start With Context

Before proposing or changing code:

1. Read the repository instructions and existing documentation.
2. Inspect `package.json`, the folder layout, the routes, and a couple of representative pages and components.
3. Preserve established conventions when working in an existing project unless the user explicitly asks to change them.
4. Confirm the scope before adding a new library, a state manager, a CSS framework, or a testing setup.

For a new project, use the defaults in this skill.

## New Project Intake

Before scaffolding, make sure the user has described what the site or app is for. Establish:

- Who uses it, on which devices (assume phones first), and in which languages.
- The pages or screens and the main action on each one.
- Where the content comes from: written in code, loaded from an API, or edited by the team in a dashboard.
- Whether it needs sign-in, forms, or a chat or assistant widget.
- Whether it is a site (header with links) or an app with three to five main sections (header plus a bottom tab bar on phones).
- Hosting, and whether the backend serves the built files.

Ask focused questions only for what would change the structure. For a small prototype, state your assumptions and keep them easy to change.

## Default Stack

- React with TypeScript, built with Vite.
- `react-router-dom` for routes; pages are lazy-loaded behind an error boundary.
- The `asaas-ui` kit (task skill `asaas-ui`) for tokens, fonts, glass components, the site header and tab bar, icons, toasts and the assistant widget. It is copied into the project as source, so the project owns it.
- Plain CSS with design tokens: one stylesheet per concern. No CSS framework unless the project already has one.
- `fetch` through one small typed API client, and local state plus React context. Add a data library (such as TanStack Query) only when caching or mutations become hard to manage by hand.
- `tsc` for types and `oxlint` (or the project's linter) for style.

## Structure

```text
src/
|-- asaas-ui/      The kit (tokens, fonts, components). Edit freely; it belongs to the project.
|-- components/    Shared site components: layout, footer, cards, page blocks.
|-- pages/         One file per route. Lazy-loaded from App.tsx.
|-- content/       Fixed interface text and default copy (the dictionary for each language).
|-- lib/           API client, auth, data hooks, small helpers.
|-- styles/        Site-level CSS layered on top of the kit.
|-- App.tsx        Routes only.
`-- main.tsx       Providers and the render call.
```

Dependencies flow one way: pages use components, components use the kit and `lib`, and nothing in `asaas-ui` imports from the site. Read [references/patterns.md](references/patterns.md) when creating a project, building the layout or header, deciding where something belongs, or wiring data, sign-in, language, SEO or tracking.

## Responsive Layout (phones first)

Most visitors are on a phone. Build the 375px layout first, then let it grow.

- **One page frame.** Every page sits in the kit's `.container` (shared `--page-max` width and `--page-pad` side padding). Never invent per-page side margins, and never use a fixed `width` in pixels for a block of content.
- **Use the kit's header.** Build the top bar with `SiteHeader`: links inline above 900px, a menu button and panel at 900px and below. For apps with three to five sections, add `TabBar` too. Do not hand-roll a row of links; that is the first thing to overflow on a phone.
- **Three breakpoints only**, from the kit: `max-width` 640px (phone), 900px (tablet, header collapses), 1080px (two-column grids become one). Use the same values in site CSS so your overrides line up with the kit's; never add a one-off breakpoint to rescue a single element.
- **Grids and rows shrink.** Use `minmax(0, 1fr)` tracks, `repeat(auto-fit, minmax(…, 1fr))`, and `flex-wrap: wrap` (the kit's `.cluster`). Give every flex child that holds text `min-width: 0`.
- **Fluid type for big headings.** Use `.display` and `.title` (`clamp()` sizes) for hero and section headings; keep app headings at the kit's fixed sizes.
- **Media and tables.** Images and video have `width`/`height` attributes and never exceed their container. Wide tables go inside `.table-wrap`, or turn into cards on phones.
- **Notches and home bars.** The kit sets `viewport-fit=cover`; anything fixed to the bottom or top edge pads itself with `env(safe-area-inset-*)`. Use `dvh`, not `vh`, for full-height panels.
- **Tap targets** are at least 44px (`--tap`). Hover is never the only way to reach something.

## Implementation Rules

- **Tokens, not hex values.** Colours, radii, spacing and sizes come from CSS variables so dark mode and the brand stay consistent.
- **RTL first, with logical CSS.** Use `margin-inline`, `padding-inline`, `inset-inline`, and `text-align: start`/`end`; avoid `left` and `right` for layout. For movement along the reading direction multiply by the kit's `--dir-x`. Directional icons (`chevronLeft`/`chevronRight`) are drawn for Arabic and the kit's `Icon` mirrors them when `<html dir="ltr">`.
- **No text in components when it can be avoided.** Fixed interface words go through the dictionary function (`t('key')`); content that the team edits comes from the API. The kit's own words (close, retry, loading…) follow `<html lang>` and can be reworded with `setKitText`. Never leave an Arabic-only string in a page that has an English version.
- **One place for data access.** Components call the shared API client or hook, never `fetch` directly. Show a loading state, an error state with a retry, and an empty state.
- **Errors never blank the page.** Wrap the routes in an error boundary. A failed lazy chunk (common right after a deploy) reloads the page once; any other error shows a message with a way back.
- **Forms.** Controlled fields with real labels, native validation attributes, a disabled and labelled submit while sending, a visible server error, and a hidden honeypot field on public forms.
- **Sign-in through the backend.** Prefer an `HttpOnly`, `Secure`, `SameSite` session cookie set by the server over tokens in `localStorage`. Send `credentials: 'include'`, handle `401` in one place (clear the user, go to sign-in, return afterwards), and protect routes with one guard component. The front end hides what a user cannot do; the server enforces it.
- **Links from data are untrusted.** Pass any URL that came from the API or a dashboard through `safeHref` (only `http`, `https`, `mailto`, `tel` and same-site paths) before rendering it.
- **No `dangerouslySetInnerHTML`** with content that is not fixed in the code.
- **Content Security Policy friendly.** Do not add inline `<script>` tags or load scripts from other origins. The kit's installer loads start-up code (theme, language and direction before first paint) from `public/theme-init.js`. Inline `style` attributes for CSS variables are fine.
- **Configuration.** Only `VITE_`-prefixed variables reach the browser, and everything in the bundle is public. Read them in one `lib/config.ts`; never put secrets there.
- **Small, focused components.** Split a file when it holds more than one idea, not before. Keep a component's props simple and typed; no `any`.
- **Performance.** Lazy-load routes and heavy widgets, give images width and height, use modern formats, and do not ship large assets that a page does not show.

## Accessibility

- Use the right element: `button` for actions, `a` for navigation, headings in order, one `h1` per page.
- Every control is reachable and visible with the keyboard, with a clear focus style. The kit's `Modal` moves focus in, keeps Tab inside, closes with Escape and returns focus; custom dialogs must do the same.
- Text and icons keep enough contrast in both themes. State is never shown by colour alone.
- Respect `prefers-reduced-motion`: turn animations off or make them instant.
- Set `lang` and `dir` on the document, and update them when the language changes.
- Each page sets its own `<title>` and description (see patterns), so links shared on social apps and search results read correctly.

## Testing And Verification

Pick the smallest check that proves the change:

1. `tsc -b` and the linter pass, and `npm run build` succeeds.
2. Open the page in a browser at **375px**, 768px and desktop width, in light and dark themes, and in each language. At 375px, `document.documentElement.scrollWidth` must equal `window.innerWidth` (no sideways scroll), and the header menu must open, close and navigate.
3. Look at the browser console for errors, especially Content Security Policy violations.
4. Exercise the main action (submit the form, open the modal, switch the language) and one failure path.
5. Add automated tests when the project already has a test runner or the logic is easy to get wrong (formatters, validators, data mapping). Do not introduce a test framework for a static page.

## Workflow

1. Establish the requested behaviour and which pages, components and styles it touches.
2. Inspect existing patterns before choosing names or structure; reuse a component before writing a new one.
3. Implement from the data inward: types and API calls, then components, then the page and route. Lay out the phone width first.
4. Add both languages' text at the same time when the project is bilingual.
5. Verify as described above, then update the project's documentation for anything others must know.

## Boundaries

- Do not add a UI library, CSS framework, state manager, or build tool without a requirement.
- Do not move a working project to this structure just to match it.
- Do not put secrets, API keys, or private URLs in front-end code; everything in the bundle is public.
- Do not copy project-specific copy, brand assets or data into reusable components.
- Do not commit, push, deploy, or change external systems unless explicitly authorized.
