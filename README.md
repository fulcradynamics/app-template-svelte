# Fulcra App Template - Svelte

A SvelteKit web application template for building on the Fulcra platform. This template includes:

- **SvelteKit** with Svelte 5
- **Auth0 authentication** via the device flow, with server-side API proxying
- **Tailwind CSS 4** with DaisyUI
- **Fulcra brand colors** and styling
- **ESLint** and **Prettier** configured
- **Vitest** for testing

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Then edit `.env` with your Auth0 credentials and Fulcra API endpoint.

3. Run the development server:

```bash
npm run dev
```

The app will be available at http://localhost:6173/

4. Build for production:

```bash
npm run build
```

## Deployment

This template uses `@sveltejs/adapter-auto`, which detects the host at build time — no config change is needed for Vercel, Netlify, Cloudflare Pages, or Azure Static Web Apps.

**Environment variables** — wherever you deploy, set the same three vars from your `.env` in the platform's project settings:

- `PUBLIC_AUTH0_DOMAIN`
- `PUBLIC_AUTH0_CLIENT_ID`
- `PUBLIC_FULCRA_API_ENDPOINT` (point this at a reachable API — not `localhost`)

> Device-flow login uses no callback URLs, and logout uses no `returnTo`. Auth0 must allow the device-code grant for this client; see Authentication below. Production requires HTTPS for Secure cookies. Configure the deployment's public origin correctly behind proxies so same-origin checks see the browser-facing origin.

### Local

```bash
npm run dev                  # dev server at http://localhost:6173
npm run build && npm run preview   # preview the production build locally
```

For a **self-hosted Node server or Docker** (not covered by `adapter-auto`), swap the adapter in `svelte.config.js` to `@sveltejs/adapter-node` (already in `devDependencies`), then:

```bash
npm run build
node build
```

### Vercel

**Git integration (recommended):**

1. Import the repo at [vercel.com](https://vercel.com) — SvelteKit is auto-detected.
2. Add the three env vars under Project Settings → Environment Variables.
3. Every push deploys automatically.

**CLI:**

```bash
vercel login
vercel link                  # create/link the project
vercel env add PUBLIC_AUTH0_DOMAIN        # repeat for each var
vercel deploy                # preview deploy
vercel deploy --prod         # production deploy
```

## Customization

Edit `src/lib/app-config.js` for login branding: `appName`, `tagline`,
`description`, `showSlots`, and optional `logoSrc` (for example `/logo.svg`
from `static/`). The existing placeholder appearance is the default.
`LoginDeviceFlow` also accepts optional props with these names, defaulting to the config.

The sign-in header and the signed-in footer show "Powered by Fulcra"
(`PoweredByFulcra.svelte`); clicking it opens a drawer on building your own app
with Fulcra. Keep it in both places.

Build your feature UI in `src/routes/+page.svelte`. The root layout's `AuthGate`
restores the server session before mounting feature children or showing login;
cached localStorage user info alone never opens the gate. Keep initialization and
login gating out of feature pages. Branding and feature customization should not
require changes to auth components, the gate, `user.js`, `auth0-device-flow.js`,
or server auth/API routes. Direct sign-out calls can remain in feature UI.

The client gate controls rendering only; it does not authorize or prevent SvelteKit
server loads. Server loads, API routes, and protected server-side fetches must still
enforce authentication and authorization before returning protected data.

## Authentication

This template uses the **Auth0 Device Authorization Flow**. The session is only the
Fulcra access token, kept by the server in a host-only HTTP-only cookie; no token is
returned in browser JSON. There is no refresh token, so people sign in again when the
access token expires (24 hours).

### Session state and restoration

`src/lib/user.js` exposes one reactive, in-memory store with `restoring`,
`authenticated`, `signing-out`, `signed-out`, and `error` states. The root `AuthGate` and feature
pages consume this same state. Initialization is deduplicated. Profiles are not
persisted; the legacy `fulcraUserState` localStorage entry is removed best effort
and never read. Storage being unavailable does not break authentication.

Reloading validates the session through server-proxied Auth0 user info and loads
Fulcra account info before revealing feature children. Cookie presence and cached
profiles are not proof of authentication. A 401 signs out; network/provider failures
show an error instead of pretending the session is absent. Feature requests should
use `user.request()` so a 401 invalidates the shared state and logout waits for
pending responses. The rendering gate is not authorization: every protected server
route must use the shared server helper or otherwise independently authorize.

### Login and server API access

1. The sign-in click opens a popup synchronously (including Safari). It visits
   Auth0 logout briefly, then the verification page. While authorization is pending,
   the app shows the sign-in link (one click selects it), a QR code and the user code,
   so people in embedded browsers that block popups can finish in their main browser
   or on a phone.
2. `/api/auth/device/code` requests `openid profile email`.
3. The browser polls `/api/auth/device/token`; success sets the access cookie on the
   server and returns only status.
4. Once signed in, the popup visits Auth0 logout again and closes, so Auth0 keeps no
   session in that browser and the next person there must enter a password. The
   app's own cookie is unaffected. Approving in another browser or on a phone leaves
   that browser's Auth0 session alone.
5. `/api/auth/user` validates against Auth0. `/api/user/info` POST loads the Fulcra
   account and registers it if missing; GET only reads and never registers.
6. Server routes call the Fulcra API through `src/lib/server/api.js` (`apiFor`), which
   uses `authorizedFetch` from `src/lib/server/session.js`. A missing cookie or an
   upstream 401 clears the cookie and returns 401; 403 and network errors keep it.

### Cookie policy and CSRF

The access cookie uses `HttpOnly`, `SameSite=Lax`, `Path=/`, no Domain, and `Secure`
in production (disabled only in development for HTTP localhost/Safari). In production
its name carries the `__Host-` prefix, so apps on sibling subdomains can't plant a
cookie with the same name. It lasts the provider's `expires_in`, capped at 24 hours,
and survives reloads and browser restarts. HTTP-only prevents JavaScript access, not
theft through a compromised host/browser.

`src/hooks.server.js` rejects every unsafe request with a missing or foreign
Origin, including JSON device-code, token, registration, and logout routes, and
rejects cross-site Fetch Metadata. Browser same-origin fetch supplies Origin on
POST. Non-browser clients must supply the correct Origin too; this check is CSRF
protection, not authentication. API responses are `Cache-Control: no-store`.
Do not add mutations to GET handlers.

### Logout

Sign Out clears in-memory profiles immediately and opens the Auth0 logout popup
synchronously, before any await; popup navigation is best effort. In-flight browser
operations settle before `/api/auth/logout` clears the cookie, so a late Set-Cookie
response cannot undo logout. The gate shows “Signing out” with no account data or
login controls. Each wait is capped at 10 seconds; a timeout shows a warning and a
retry Sign Out button, not success, and new login and feature requests stay blocked
until a retry confirms sign-out. Closing the page without signing out leaves the app
signed in in that browser until the access token expires. Signing out does not revoke
an already-issued access token at the API.

Tests exercise mocked provider responses and browser UI/state transitions. Live
Auth0 sign-in, deployed HTTPS cookies, and real Safari behavior require deployment
testing with credentials.

## Fulcra API Client

The template includes a `FulcraAPI` class (`src/lib/api-client.js`) for organized access to the Fulcra REST API:

- **High-level methods** for common operations: `getUserInfo()`, `getUserPreferences()`, etc.
- **Low-level HTTP methods** for flexibility: `get()`, `post()`, `put()`, `delete()`
- **Designed for extension** — add new methods following the existing pattern; server routes obtain the client through `apiFor(cookies)` so they share authorization

See the [Fulcra REST API documentation](https://docs.fulcradynamics.com/rest-api/) for available endpoints. When you need to call a new endpoint, add a method to `FulcraAPI` and use it from your server routes.

## Project Structure

```
src/
├── app.html                        # HTML template
├── app.d.ts                        # Type declarations
├── lib/
│   ├── auth0-device-flow.js        # Auth0 device authorization flow client
│   ├── user.js                     # User/auth store (login, logout, session)
│   ├── app-config.js               # Login branding customization
│   ├── api-client.js               # FulcraAPI class for calling the Fulcra API
│   └── components/
│       ├── AuthGate.svelte         # Session restoration and login boundary
│       ├── LoginDeviceFlow.svelte  # Login screen
│       └── PoweredByFulcra.svelte  # Fulcra branding and build-your-own-app drawer
└── routes/
    ├── layout.css                  # Global styles with Fulcra colors
    ├── +layout.svelte              # Root layout
    ├── +page.svelte                # Home page
    └── api/                        # Server routes (auth + API proxy)
        ├── auth/                   # device/code, device/token, user, logout
        └── user/                   # info, preferences
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint code with ESLint
- `npm test` - Run tests
