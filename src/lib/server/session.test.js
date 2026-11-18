import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('$env/dynamic/public', () => ({
  env: { PUBLIC_AUTH0_DOMAIN: 'auth.example', PUBLIC_AUTH0_CLIENT_ID: 'test' }
}));
vi.mock('$app/environment', () => ({ dev: false }));
/** @type {typeof import('./session.js')} */
let session;
/** @param {unknown} data */
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });
/** @param {Record<string, string>} [values] */
function cookies(values = {}) {
  const data = new Map(Object.entries(values));
  return {
    get: (/** @type {string} */ key) => data.get(key),
    set: vi.fn((key, value) => data.set(key, value)),
    delete: vi.fn((key) => data.delete(key))
  };
}
beforeEach(async () => {
  vi.resetModules();
  session = await import('./session.js');
});
afterEach(() => {
  vi.unstubAllGlobals();
});
it('stores the access token in a secure HTTP-only cookie for at most 24 hours', () => {
  const jar = cookies();
  session.storeSession(jar, { access_token: 'access', expires_in: 120 });
  expect(jar.set).toHaveBeenCalledWith(
    '__Host-fulcra_access_token',
    'access',
    expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', maxAge: 120 })
  );
  session.storeSession(jar, { access_token: 'access', expires_in: 7 * 86400 });
  expect(jar.set).toHaveBeenLastCalledWith(
    '__Host-fulcra_access_token',
    'access',
    expect.objectContaining({ maxAge: 86400 })
  );
});
it('rejects a token response without a usable lifetime', () => {
  const jar = cookies();
  expect(() => session.storeSession(jar, { access_token: 'access', expires_in: 0 })).toThrow();
  expect(jar.set).not.toHaveBeenCalled();
});
it('signs out on 401, but keeps the cookie on 403 and network errors', async () => {
  const jar = cookies({ '__Host-fulcra_access_token': 'access' });
  const fetcher = vi.fn(async () => reply({}, 403));
  vi.stubGlobal('fetch', fetcher);
  await expect(session.authorizedFetch(jar, 'https://api.example/info')).rejects.toMatchObject({
    status: 403
  });
  fetcher.mockRejectedValueOnce(new Error('offline'));
  await expect(session.authorizedFetch(jar, 'https://api.example/info')).rejects.toMatchObject({
    status: 503
  });
  expect(jar.delete).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(reply({}, 401));
  await expect(
    session.authorizedFetch(jar, 'https://api.example/change', { method: 'POST' })
  ).rejects.toMatchObject({ status: 401 });
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(jar.get('__Host-fulcra_access_token')).toBeUndefined();
});
it('rejects requests without a session cookie before calling upstream', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  await expect(
    session.authorizedFetch(cookies(), 'https://api.example/info')
  ).rejects.toMatchObject({ status: 401 });
  expect(fetcher).not.toHaveBeenCalled();
});
it('never asks for or keeps a refresh token, and returns no token to the browser', async () => {
  const fetcher = vi.fn(async (url, options) => {
    if (url.endsWith('/oauth/device/code')) {
      expect(JSON.parse(options.body).scope.split(' ')).not.toContain('offline_access');
      return reply({ device_code: 'device' });
    }
    return reply({
      access_token: 'secret-access',
      refresh_token: 'secret-refresh',
      id_token: 'secret-id',
      expires_in: 3600
    });
  });
  vi.stubGlobal('fetch', fetcher);
  await (await import('../../routes/api/auth/device/code/+server.js')).POST();
  const { POST } = await import('../../routes/api/auth/device/token/+server.js');
  const jar = cookies();
  const result = await POST(
    /** @type {any} */ ({
      cookies: jar,
      request: new Request('https://app.example/api/auth/device/token', {
        method: 'POST',
        body: JSON.stringify({ deviceCode: 'device' })
      })
    })
  );
  expect(await result.json()).toEqual({ status: 200 });
  expect(jar.set).toHaveBeenCalledOnce();
  expect(jar.get('__Host-fulcra_access_token')).toBe('secret-access');
});
it('logout clears the cookie without calling the provider', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const jar = cookies({ '__Host-fulcra_access_token': 'access' });
  const { POST } = await import('../../routes/api/auth/logout/+server.js');
  const result = await POST(/** @type {any} */ ({ cookies: jar }));
  expect(await result.json()).toEqual({ signedOut: true });
  expect(jar.get('__Host-fulcra_access_token')).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects foreign and missing origins for JSON mutations including logout', async () => {
  const { handle } = await import('../../hooks.server.js');
  for (const origin of [null, 'https://evil.example']) {
    const event = {
      url: new URL('https://app.example/api/auth/logout'),
      request: new Request('https://app.example/api/auth/logout', {
        method: 'POST',
        headers: origin ? { Origin: origin, 'Content-Type': 'application/json' } : {}
      })
    };
    expect(
      (
        await handle({
          event: /** @type {import('@sveltejs/kit').RequestEvent} */ (
            /** @type {unknown} */ (event)
          ),
          resolve: vi.fn()
        })
      ).status
    ).toBe(403);
  }
});
it('allows same-origin mutations and marks API responses non-cacheable', async () => {
  const { handle } = await import('../../hooks.server.js');
  const event = {
    url: new URL('https://app.example/api/auth/logout'),
    request: new Request('https://app.example/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://app.example' }
    })
  };
  const resolve = vi.fn(async () => reply({}));
  const result = await handle({ event: /** @type {any} */ (event), resolve });
  expect(resolve).toHaveBeenCalledOnce();
  expect(result.headers.get('cache-control')).toBe('no-store');
});
it('rejects cross-site Fetch Metadata even with a matching Origin', async () => {
  const { handle } = await import('../../hooks.server.js');
  const event = {
    url: new URL('https://app.example/api/auth/logout'),
    request: new Request('https://app.example/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://app.example', 'Sec-Fetch-Site': 'cross-site' }
    })
  };
  const resolve = vi.fn(async () => reply({}));
  const result = await handle({ event: /** @type {any} */ (event), resolve });
  expect(result.status).toBe(403);
  expect(resolve).not.toHaveBeenCalled();
});
it('drops the __Host- prefix in development, where cookies are not Secure', async () => {
  vi.resetModules();
  vi.doMock('$app/environment', () => ({ dev: true }));
  const devSession = await import('./session.js');
  const jar = cookies();
  devSession.storeSession(jar, { access_token: 'access', expires_in: 120 });
  expect(jar.set).toHaveBeenCalledWith(
    'fulcra_access_token',
    'access',
    expect.objectContaining({ secure: false })
  );
  vi.doUnmock('$app/environment');
});
