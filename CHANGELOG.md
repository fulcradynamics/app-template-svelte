# Changelog

Breaking changes only, newest first. Each entry says what an app built from an
earlier version must change to match. An app's version is `TEMPLATE_VERSION` in
`src/lib/template-version.js`; apps without that file predate 1.0.0.

## 1.0.0

- **Session cookie.** The server keeps only the Fulcra access token, in an HTTP-only
  browser-session cookie named `__Host-fulcra_access_token` (`fulcra_access_token`
  in local development). Server code that reads `fulcra_access_token` must use the
  new name, or call the API through `apiFor(cookies)` in `src/lib/server/api.js`.
- **No refresh token.** Sign-in no longer requests `offline_access`; people sign in
  again after 24 hours or when the browser quits. `/api/auth/revoke` is replaced by
  `/api/auth/logout`, which only clears the cookie. `/api/auth/token` and
  `/api/auth/check` are gone: `/api/auth/device/token` sets the cookie itself.
- **Sign-in gating.** The root layout's `AuthGate` restores the session and shows
  sign-in. Pages no longer call `user.init()` or render `LoginDeviceFlow`; sign-in
  copy and logo come from `src/lib/app-config.js`.
- **User store.** `$lib/user` keeps state in memory only (the `fulcraUserState`
  localStorage entry is removed) and exposes `$user.status`. `set` and `update` are
  gone. Make feature requests with `user.request()` so a 401 signs the user out.
- **`/api/user/info`.** `GET` only reads the account; `POST` registers it if missing.
- **CSRF.** `src/hooks.server.js` rejects unsafe requests (POST, PUT, DELETE) without
  a same-origin `Origin` header.
