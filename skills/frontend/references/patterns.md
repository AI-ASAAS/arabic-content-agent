# Frontend patterns

Short, copyable patterns for the decisions that come up in most ASAAS front ends. They come from the ASAAS company site; adapt names to the project.

## Contents

- Starting a project
- Layout, header and phone menu
- Routes, pages and errors
- API client and data loading
- Sign-in
- Language and direction
- Theme and start-up script
- Page titles and SEO
- Configuration
- Safe links
- Visitor tracking (only when asked for)
- Build and delivery
- Phone checklist and layout lessons

## Starting a project

1. `npm create vite@latest <name> -- --template react-ts`, then `npm install`.
2. Install the kit with the `asaas-ui` skill's `scripts/install.mjs`. It copies `src/asaas-ui/` and `public/` (brand files and `theme-init.js`), sets `index.html` to Arabic RTL with `viewport-fit=cover` and the external start-up script, and imports the styles in `main.tsx`.
3. Wrap the app in `ToastProvider` (from the kit) and, when bilingual, your own `LangProvider` (below). Render `<Ambient />` once behind the content.
4. Delete Vite's demo files, then add `components/`, `pages/`, `content/`, `lib/` and `styles/` as needed.

## Layout, header and phone menu

One `Layout` component owns the page frame, so no page decides its own width or header.

```tsx
// components/Layout.tsx
import { NavLink, Outlet, Link } from 'react-router-dom';
import { SiteHeader, TabBar, Icon } from '../asaas-ui';
import { t } from '../content';

const LINKS = [
  { to: '/', key: 'nav.home', icon: 'dashboard' },
  { to: '/projects', key: 'nav.projects', icon: 'briefcase' },
  { to: '/contact', key: 'nav.contact', icon: 'phone' },
] as const;

export function Layout() {
  return (
    <>
      <SiteHeader
        brand={<Link to="/" className="brand"><span className="brand__mark" />{t('site.name')}</Link>}
        nav={LINKS.map((l) => <NavLink key={l.to} to={l.to} end>{t(l.key)}</NavLink>)}
        actions={<><LangSwitch /><ThemeToggle /></>}
      />
      <main className="container">
        <Outlet />
      </main>
      {/* Apps only (3–5 sections): the tab bar shows at 900px and below. */}
      {/* <TabBar>{LINKS.map((l) => <NavLink key={l.to} to={l.to} end><Icon name={l.icon} />{t(l.key)}</NavLink>)}</TabBar> */}
    </>
  );
}
```

- `NavLink` sets `aria-current="page"`, which the header and tab bar style.
- The header's menu closes on a link tap, Escape, a tap outside, and when the window grows past 900px; it locks page scroll while open.
- Keep `actions` to two or three small controls. A long call-to-action button belongs in the page or as the last link in `nav`, not in the bar.
- Full-bleed sections (a coloured hero) sit outside `.container` and put a `.container` inside for their content.

## Routes, pages and errors

Keep `App.tsx` to routes. Lazy-load every page except the home page, give the suspense fallback a skeleton so layout does not jump, and put an error boundary around the routes.

```tsx
const Projects = lazy(() => import('./pages/Projects'));

<ErrorBoundary>
  <Suspense fallback={<div className="page"><Skeleton count={3} height={140} /></div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </Suspense>
</ErrorBoundary>
```

```tsx
// components/ErrorBoundary.tsx
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidCatch(error: unknown) {
    // After a deploy, old chunk names 404. Reload once to fetch the new build.
    const chunkFailed = error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message);
    if (chunkFailed && !sessionStorage.getItem('chunk-reload')) {
      sessionStorage.setItem('chunk-reload', '1');
      location.reload();
    }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="page"><ErrorState error={new Error(t('error.page'))} onRetry={() => location.reload()} /></div>;
  }
}
```

Clear `chunk-reload` after a successful start (for example in `main.tsx` once the app has rendered).

- A page that should be reachable by link only (a hidden page) is simply left out of the navigation list; add `noindex` to it and to the server's response header too.
- The server must return the app's `index.html` for unknown paths and a real 404 status for paths that are not pages.

## API client and data loading

One small module owns `fetch`. It adds shared headers (such as the language), sends the session cookie, turns failures into a typed error with a readable message, and offers a hook that loads, cancels stale requests and can retry.

```ts
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('X-Lang', getLang());
  if (init?.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${config.apiBase}${path}`, { ...init, headers, credentials: 'include' });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.status === 401) onUnauthorized();
  if (!response.ok) throw new ApiError(body?.message ?? t('api.error'), response.status);
  return body as T;
}

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: Boolean(path) });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: undefined }));
    request<T>(path, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error, loading: false });
      });
    return () => controller.abort(); // path changed or the component left: drop the old answer
  }, [path, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
```

Render the three states every time: loading (`Skeleton`), error (`ErrorState` with `reload`), and data (or an `EmptyState` that says what to do next).

Site-wide content that rarely changes (settings, copy edited from a dashboard) is loaded once near the root and shared through a context hook such as `useSite()`.

## Sign-in

- The backend sets an `HttpOnly; Secure; SameSite=Lax` session cookie. The front end never reads or stores the token.
- An `AuthProvider` loads the current user once (`GET /me`), exposes `user`, `signIn`, `signOut`, and is the only place that changes them.
- `onUnauthorized()` in the API client clears the user and sends them to `/sign-in?next=<current path>`; after sign-in, go to `next` only if it is a same-site path (`safeHref`).
- A `RequireAuth` route wrapper shows a skeleton while the user is loading, then the page or a redirect.
- If the backend uses cookies across origins, it must also protect state-changing requests against CSRF (a token header or `SameSite=Strict`); agree this with the backend owner.

## Language and direction

Arabic is the default and right-to-left; English is left-to-right.

- A site-owned `LangProvider` holds the language, saves it as `asaas-lang`, sets `lang` and `dir` on `<html>`, and remounts the tree (`key={lang}`) when the language changes so every component re-reads its text. Remounting clears in-progress form input, so put the language switch where no form is open, or keep drafts in state above the provider.
- `t('key')` returns fixed interface text from two dictionaries typed with the same keys, so a missing translation fails the type check.
- `getLang()` and a small `pick(ar, en)` helper serve code that is not a hook.
- The kit's own words read `<html lang>` through `kitText`; reword them with `setKitText('en', { … })` at start-up.
- Text that comes from the API is translated by the server, chosen by the `X-Lang` request header.
- Write CSS with logical properties so most of the layout flips by itself. Put the few real overrides in one block at the end of the stylesheet, guarded by `:root[dir='ltr']`.

## Theme and start-up script

The kit's installer copies `public/theme-init.js` and loads it from `index.html` with `<script src="/theme-init.js"></script>`. It sets the theme (`asaas-theme`), language (`asaas-lang`) and direction before first paint, so the page never flashes, and needs no inline script, so a strict Content Security Policy works.

- Because this file is not fingerprinted, the server must serve it with `Cache-Control: no-cache`.
- Vite prints a notice that it cannot bundle a classic script; that is expected, the file is served as-is from `public/`.
- The theme is light by default and dark only when the visitor chooses it; it does not follow `prefers-color-scheme`. That is a brand decision: change it in `theme-init.js` and `useTheme` together if a project needs it.

## Page titles and SEO

- Each page sets its title and description, for example with a tiny `usePageMeta({ title, description })` hook that writes `document.title` and the `description` meta tag, and restores them on unmount.
- `index.html` keeps a good default title, description, `og:title`, `og:description` and `og:image` for link previews, since social apps do not run JavaScript.
- When a public page must rank or preview with its own text, ask whether to prerender it at build time or have the backend render its meta tags; do not add a framework just for this.

## Configuration

```ts
// lib/config.ts: the only file that reads import.meta.env
export const config = {
  apiBase: import.meta.env.VITE_API_BASE ?? '/api',
} as const;
```

Only `VITE_`-prefixed variables reach the browser, and they are public. Commit a `.env.example` with every key and no secret values.

## Safe links

Anything that arrives as data and becomes an `href` goes through a check first. Parse it rather than pattern-match: browsers treat `\` like `/`, so `/\evil.com` is another site.

```ts
export function safeHref(value: string): string {
  const raw = value.trim();
  if (/[\\\u0000-\u001f]/.test(raw)) return '#';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol === 'mailto:' || url.protocol === 'tel:') return raw;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '#';
    if (url.origin === window.location.origin) return url.pathname + url.search + url.hash;
    return raw.startsWith('/') ? '#' : url.href; // a "path" that leaves the site is refused
  } catch {
    return '#';
  }
}
```

External links also get `target="_blank"` with `rel="noopener noreferrer"`.

## Visitor tracking (only when asked for)

When the team wants visitor statistics, send one small request per page view from a tiny helper, and keep it privacy-friendly:

- No cookies and no stored IP address or user agent; the server derives an anonymous daily identifier.
- Skip visits when `navigator.doNotTrack` is on and on admin pages.
- Never let tracking block rendering or show an error to the visitor.

## Build and delivery

- `npm run build` runs `tsc -b` first, so a type error stops the build.
- Vite fingerprints files under `assets/`; serve those with a long immutable cache. Serve `index.html` and any non-fingerprinted script or stylesheet with `no-cache`.
- When the backend serves the built files, it returns `index.html` for page routes and sets security headers (Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Keep fonts under `src/` so Vite bundles them with hashed names, and check the font licence allows embedding.

## Phone checklist and layout lessons

Run this at 375px (and 360px for small Android phones) on every new page:

```js
// In the browser console: lists every element wider than the screen.
[...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1 || el.getBoundingClientRect().left < -1)
```

- No sideways scroll: `document.documentElement.scrollWidth === innerWidth`.
- The header shows the brand, the actions and the menu button on one line; the menu opens, scrolls if long, and closes on a link tap.
- Nothing fixed to the bottom hides content or sits under the home bar.
- Buttons with long labels wrap instead of overflowing (the kit allows this below 640px).

Lessons from real pages:

- `min-height` combined with `aspect-ratio` can make an element wider than its container on phones; give it a fixed height there instead.
- A row of chips or tags must be allowed to wrap, or scroll sideways inside its own box (the kit's `.chips`), or it overflows the screen.
- A flex child holding long text needs `min-width: 0`, or it refuses to shrink.
- A `position: fixed` element inside anything with `backdrop-filter` or `transform` is positioned against that ancestor, not the screen.
- `100vw` includes the scrollbar on desktop and causes sideways scroll; use `100%`.
- In RTL, Chromium can widen the page by the scroll width of a table that scrolls inside its box; `.table-wrap` uses `contain: paint` to stop it.
