import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// The session is only the access token, in an HTTP-only cookie. There is no refresh token,
// so people sign in again when it expires. It's a browser-session cookie (no Max-Age), so
// quitting the browser also ends it, where the browser doesn't restore sessions.
// The __Host- prefix stops other subdomains from planting this cookie. Browsers require
// Secure for it, so development over HTTP localhost uses the plain name.
const ACCESS = `${dev ? '' : '__Host-'}fulcra_access_token`;
const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: !dev,
  sameSite: /** @type {const} */ ('lax')
};
/** @typedef {Pick<import('@sveltejs/kit').Cookies, 'get' | 'set' | 'delete'>} CookieJar */

/** @param {CookieJar} cookies */
export function clearSession(cookies) {
  cookies.delete(ACCESS, cookieOptions);
}

/** @param {CookieJar} cookies @param {{ access_token: string, expires_in: number }} tokens */
export function storeSession(cookies, tokens) {
  if (!tokens.access_token || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) {
    error(502, 'Identity provider did not issue a session');
  }
  cookies.set(ACCESS, tokens.access_token, cookieOptions);
}

// Validate on the upstream server, not by cookie presence or unverified JWT claims.
/** @param {CookieJar} cookies @param {string | URL | Request} url @param {RequestInit} [options] @returns {Promise<Response>} */
export async function authorizedFetch(cookies, url, options = {}) {
  const token = cookies.get(ACCESS);
  if (!token) error(401, 'Not authenticated');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  let response;
  try {
    response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(10000) });
  } catch {
    error(503, 'Upstream temporarily unavailable');
  }
  if (response.status === 401) {
    clearSession(cookies);
    error(401, 'Not authenticated');
  }
  if (response.status === 403) error(403, 'Access denied');
  return response;
}
