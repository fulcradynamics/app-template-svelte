import { afterEach, beforeEach, expect, it, vi } from 'vitest';
/** @type {typeof import('@testing-library/svelte').cleanup} */
let cleanup;
/** @type {typeof import('@testing-library/svelte').render} */
let render;
/** @type {typeof import('@testing-library/svelte').screen} */
let screen;
/** @type {typeof import('@testing-library/svelte').waitFor} */
let waitFor;

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));
vi.mock('svelte/transition', () => ({ blur: () => ({ duration: 0 }) }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_AUTH0_DOMAIN: 'auth.example',
    PUBLIC_AUTH0_CLIENT_ID: 'test',
    PUBLIC_FULCRA_API_ENDPOINT: 'https://api.example'
  }
}));

/** @param {unknown} data */
const response = (data, ok = true) => ({ ok, json: async () => data });
const profile = { 'fulcradynamics.com/userid': 'restored' };
const device = {
  device_code: 'device',
  user_code: 'ABCD',
  verification_uri_complete: 'https://auth.example/verify',
  interval: 1
};
function deferred() {
  /** @type {(value: unknown) => void} */
  let resolve = () => {};
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

beforeEach(async () => {
  vi.resetModules();
  ({ cleanup, render, screen, waitFor } = await import('@testing-library/svelte'));
  const storage = new Map();
  vi.stubGlobal('localStorage', {
    /** @param {string} key */
    getItem: (key) => storage.get(key) ?? null,
    /** @param {string} key @param {string} value */
    setItem: (key, value) => storage.set(key, String(value)),
    /** @param {string} key */
    removeItem: (key) => storage.delete(key)
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it.each([null, JSON.stringify({ auth0UserInfo: profile, fulcraUserInfo: {} })])(
  'withholds children and login until the entire server restoration finishes (cached: %s)',
  async (cached) => {
    if (cached) localStorage.setItem('fulcraUserState', cached);
    const check = deferred();
    const info = deferred();
    const fetcher = vi.fn((url) => {
      if (url === '/api/auth/check') return check.promise;
      if (url === '/api/auth/user') return Promise.resolve(response(profile));
      if (url === '/api/user/info') return info.promise;
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const { default: Layout } = await import('./LayoutHarness.svelte');
    const mounted = vi.fn();
    render(Layout, { mounted });
    expect(screen.queryByText('Private feature')).toBeNull();
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Sign In' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create Account' })).toBeNull();
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/auth/check'));
    check.resolve(response({ authenticated: true }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/user/info'));
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Sign In' })).toBeNull();
    info.resolve(response({}));
    await screen.findByText('Private feature');
    expect(mounted).toHaveBeenCalledTimes(1);
  }
);

it.each([false, true])(
  'shows a restoration alert without login or children when storage throws (cached: %s)',
  async (cached) => {
    if (cached) {
      localStorage.setItem(
        'fulcraUserState',
        JSON.stringify({ auth0UserInfo: profile, fulcraUserInfo: {} })
      );
    }
    const { user } = await import('../src/lib/user.js');
    const { get } = await import('svelte/store');
    expect(get(user).authenticated).toBe(cached);
    // Fail restoration writes, not store import; clearUser retries this same failure.
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const check = deferred();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => check.promise)
    );
    const { default: Layout } = await import('./LayoutHarness.svelte');
    const mounted = vi.fn();
    render(Layout, { mounted });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Private feature')).toBeNull();
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Sign In' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create Account' })).toBeNull();

    check.resolve(response({ authenticated: false }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(
      'Unable to restore your session. Please reload the page to try again.'
    );
    expect(write).toHaveBeenCalledTimes(2);
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByText('Private feature')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign In' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create Account' })).toBeNull();
  }
);

it.each(['stale', 'malformed', 'invalid-shape', 'network', 'profile'])(
  'shows login without mounting children after %s session restoration',
  async (kind) => {
    localStorage.setItem(
      'fulcraUserState',
      kind === 'malformed'
        ? '{invalid'
        : JSON.stringify({
            auth0UserInfo: kind === 'invalid-shape' ? null : profile,
            fulcraUserInfo: {}
          })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (kind === 'network') throw new Error('offline');
        if (url === '/api/auth/check') return response({ authenticated: kind === 'profile' });
        return response({}, false);
      })
    );
    const { default: Layout } = await import('./LayoutHarness.svelte');
    const mounted = vi.fn();
    render(Layout, { mounted });
    await screen.findByRole('button', { name: 'Sign In' });
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeTruthy();
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByText('Private feature')).toBeNull();
    expect(JSON.parse(localStorage.getItem('fulcraUserState') ?? '{}').auth0UserInfo).toEqual({});
  }
);

it('keeps the default document title while logged out without mounting feature children', async () => {
  document.title = '';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response({ authenticated: false }))
  );
  const { default: Layout } = await import('./LayoutHarness.svelte');
  const mounted = vi.fn();
  render(Layout, { mounted });
  await screen.findByRole('button', { name: 'Sign In' });
  expect(mounted).not.toHaveBeenCalled();
  expect(screen.queryByText('Private feature')).toBeNull();
  expect(document.title).toBe('Fulcra App Template');
});

it('hides all template placeholders when slots are disabled without a logo', async () => {
  const { default: Login } = await import('../src/lib/components/LoginDeviceFlow.svelte');
  render(Login, { showSlots: false, logoSrc: '' });
  expect(screen.queryByText('your logo')).toBeNull();
  expect(screen.queryByText('app_name')).toBeNull();
  expect(screen.queryByText(/Template slots on this screen/)).toBeNull();
  expect(screen.getByRole('img', { name: 'Fulcra' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create Account' })).toBeTruthy();
});

it('accepts custom branding and an optional logo without changing login', async () => {
  const { default: Login } = await import('../src/lib/components/LoginDeviceFlow.svelte');
  render(Login, {
    appName: 'Custom app',
    tagline: 'Custom tagline',
    description: 'Custom description',
    showSlots: false,
    logoSrc: '/custom.svg'
  });
  expect(screen.getByRole('heading', { name: 'Custom app' })).toBeTruthy();
  expect(screen.getByText('Custom tagline')).toBeTruthy();
  expect(screen.getByText('Custom description')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Custom app' }).getAttribute('src')).toBe('/custom.svg');
  expect(screen.queryByText('app_name')).toBeNull();
  expect(screen.queryByText('your logo')).toBeNull();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
});

it('does not mount children after being unmounted during restoration', async () => {
  const check = deferred();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (url === '/api/auth/check') return check.promise;
      return response(url === '/api/auth/user' ? profile : {});
    })
  );
  const { default: Layout } = await import('./LayoutHarness.svelte');
  const mounted = vi.fn();
  const view = render(Layout, { mounted });
  view.unmount();
  check.resolve(response({ authenticated: true }));
  const { user } = await import('../src/lib/user.js');
  const { get } = await import('svelte/store');
  await waitFor(() => expect(get(user).init).toBe(true));
  expect(mounted).not.toHaveBeenCalled();
  expect(screen.queryByText('Private feature')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Sign In' })).toBeNull();
});

it('shows polling failures in the real login UI without mounting feature children', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (url === '/api/auth/check') return response({ authenticated: false });
      if (url === '/api/auth/device/code') return response(device);
      return response({
        status: 400,
        data: { error: 'access_denied', error_description: 'Denied' }
      });
    })
  );
  vi.spyOn(window, 'open').mockReturnValue(null);
  const { default: Layout } = await import('./LayoutHarness.svelte');
  const mounted = vi.fn();
  render(Layout, { mounted });
  const button = await screen.findByRole('button', { name: 'Sign In' });
  vi.useFakeTimers();
  button.click();
  await vi.advanceTimersByTimeAsync(1000);
  expect(screen.getByText('Denied')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
  expect(mounted).not.toHaveBeenCalled();
});

it('uses the default app config when branding is omitted', async () => {
  const { appConfig } = await import('../src/lib/app-config.js');
  const { default: Login } = await import('../src/lib/components/LoginDeviceFlow.svelte');
  render(Login);
  expect(screen.getByRole('heading', { name: appConfig.appName })).toBeTruthy();
  expect(screen.getByText(appConfig.tagline)).toBeTruthy();
  expect(screen.getByText(appConfig.description)).toBeTruthy();
  expect(screen.getByText('your logo')).toBeTruthy();
  expect(screen.getByText('app_name')).toBeTruthy();
});

it.each([false, true])(
  'opens login synchronously, supports blocked popup (%s), completes login and signs out',
  async (blocked) => {
    const code = deferred();
    const revoke = deferred();
    const popup = { closed: false, location: { href: '' }, close: vi.fn() };
    const logoutPopup = { closed: false, close: vi.fn() };
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValueOnce(blocked ? null : /** @type {Window} */ (/** @type {unknown} */ (popup)))
      .mockReturnValueOnce(
        blocked ? null : /** @type {Window} */ (/** @type {unknown} */ (logoutPopup))
      );
    const fetcher = vi.fn(async (url, options) => {
      if (url === '/api/auth/check') return response({ authenticated: false });
      if (url === '/api/auth/device/code') return code.promise;
      if (url === '/api/auth/device/token')
        return response({
          status: 200,
          data: { access_token: 'access', refresh_token: 'refresh' }
        });
      if (url === '/api/auth/token') return response({});
      if (url === '/api/auth/user') return response(profile);
      if (url === '/api/user/info') return response({});
      if (url === '/api/auth/revoke') return revoke.promise;
      throw new Error(`Unexpected ${url} ${options?.method}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const { default: Layout } = await import('./LayoutHarness.svelte');
    const { user } = await import('../src/lib/user.js');
    render(Layout, { mounted: vi.fn() });
    const button = await screen.findByRole('button', { name: 'Sign In' });
    vi.useFakeTimers();
    button.click();
    // These assertions run in the click's call stack, before yielding to any promise.
    expect(open).toHaveBeenCalledWith(
      'about:blank',
      'auth0-device-flow',
      'width=500,height=700,left=100,top=100'
    );
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(fetcher.mock.invocationCallOrder[1]);
    if (!blocked) expect(popup.location.href).toBe('https://auth.example/v2/logout');
    code.resolve(response(device));
    await vi.advanceTimersByTimeAsync(blocked ? 0 : 1200);
    expect(screen.getByText('ABCD')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Open the verification page' }).getAttribute('href')
    ).toBe(device.verification_uri_complete);
    if (!blocked) expect(popup.location.href).toBe(device.verification_uri_complete);
    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.getByText('Private feature')).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith(
      '/api/auth/token',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ accessToken: 'access' }) })
    );
    if (!blocked) expect(popup.close).toHaveBeenCalledOnce();
    const logout = user.logout();
    expect(open).toHaveBeenLastCalledWith(
      'https://auth.example/v2/logout',
      'auth0-logout',
      'width=500,height=600,left=100,top=100'
    );
    const revokeIndex = fetcher.mock.calls.findIndex(([url]) => url === '/api/auth/revoke');
    expect(open.mock.invocationCallOrder[1]).toBeLessThan(
      fetcher.mock.invocationCallOrder[revokeIndex]
    );
    expect(fetcher).toHaveBeenCalledWith(
      '/api/auth/revoke',
      expect.objectContaining({ body: JSON.stringify({ refreshToken: 'refresh' }) })
    );
    expect(fetcher).not.toHaveBeenCalledWith('/api/auth/token', { method: 'DELETE' });
    revoke.resolve(response({}));
    await logout;
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/token', { method: 'DELETE' });
    expect(JSON.parse(localStorage.getItem('fulcraUserState') ?? '{}')).toEqual({
      auth0UserInfo: {},
      fulcraUserInfo: {}
    });
    expect(screen.queryByText('Private feature')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
    if (!blocked) expect(logoutPopup.close).toHaveBeenCalledOnce();
  }
);

it('shows device-flow errors and closes the popup', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      response(url === '/api/auth/check' ? { authenticated: false } : {}, url === '/api/auth/check')
    )
  );
  const { user } = await import('../src/lib/user.js');
  await user.init();
  const popup = { closed: false, location: { href: '' }, close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(/** @type {Window} */ (/** @type {unknown} */ (popup)));
  const { default: Login } = await import('../src/lib/components/LoginDeviceFlow.svelte');
  render(Login);
  screen.getByRole('button', { name: 'Create Account' }).click();
  await screen.findByText('Failed to start device flow');
  expect(popup.close).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
});

it('polls pending and slow_down with the increased interval, then stores and clears tokens', async () => {
  vi.useFakeTimers();
  const { Auth0DeviceFlow } = await import('../src/lib/auth0-device-flow.js');
  const auth = new Auth0DeviceFlow({ domain: 'auth.example', clientId: 'test', audience: 'test' });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response({ status: 400, data: { error: 'authorization_pending' } }))
    .mockResolvedValueOnce(response({ status: 400, data: { error: 'slow_down' } }))
    .mockResolvedValueOnce(
      response({ status: 200, data: { access_token: 'access', refresh_token: 'refresh' } })
    );
  vi.stubGlobal('fetch', fetcher);
  const poll = auth.pollForToken('device', 1);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(5999);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  await expect(poll).resolves.toEqual({ access_token: 'access', refresh_token: 'refresh' });
  expect(fetcher).toHaveBeenLastCalledWith(
    '/api/auth/device/token',
    expect.objectContaining({ body: JSON.stringify({ deviceCode: 'device' }) })
  );
  expect(await auth.getTokenSilently()).toBe('access');
  expect(auth.getRefreshToken()).toBe('refresh');
  await auth.logout();
  expect(await auth.isAuthenticated()).toBe(false);
  expect(auth.getRefreshToken()).toBeNull();
});

it.each(['denied', 'http', 'network'])('stops polling on %s errors', async (kind) => {
  vi.useFakeTimers();
  const { Auth0DeviceFlow } = await import('../src/lib/auth0-device-flow.js');
  const auth = new Auth0DeviceFlow({ domain: 'auth.example', clientId: 'test', audience: 'test' });
  const fetcher = vi.fn(async () => {
    if (kind === 'network') throw new Error('offline');
    return response(
      { status: 400, data: { error: 'access_denied', error_description: 'Denied' } },
      kind !== 'http'
    );
  });
  vi.stubGlobal('fetch', fetcher);
  const assertion = expect(auth.pollForToken('device', 1)).rejects.toThrow(
    kind === 'denied' ? 'Denied' : kind === 'http' ? 'Failed to poll for token' : 'offline'
  );
  await vi.advanceTimersByTimeAsync(1000);
  await assertion;
  await vi.advanceTimersByTimeAsync(10000);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(await auth.isAuthenticated()).toBe(false);
});
