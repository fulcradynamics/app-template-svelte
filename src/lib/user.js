import { env } from '$env/dynamic/public';
import { writable, get } from 'svelte/store';
import { createAuth0Client } from '@auth0/auth0-spa-js';
import { browser } from '$app/environment';

/**
 * A writable store that takes an object and persists it to localStorage in a given key
 *
 * Persistence is built into the svelte store instead of the underlying object since
 * svelte's $ semantics are funny for accessing underlying object values. (i.e. setters
 * against object properties don't actually work unless you're modifying the full object)
 */
const persistedObjectWritable = (key, initialValue) => {
  const store = writable(initialValue);
  const { subscribe, set } = store;

  // check for existing persisted values and populate
  if (browser) {
    try {
      // attempt to json deserialize an existing item
      const persistedValue = JSON.parse(localStorage.getItem(key));

      // smash it into our existing value
      let updatedValue = Object.assign(initialValue, persistedValue);

      // set the new updated value
      set(updatedValue);
    } catch (error) {
      // if we had any issues loading the persisted values, just reset it
      console.error(error);
      localStorage.removeItem(key);
      set(initialValue);
    }
  }

  return {
    subscribe,
    set: (value) => {
      browser && localStorage.setItem(key, JSON.stringify(value));
      set(value);
    },
    update: (callback) => {
      const updatedStore = callback(get(store));
      browser && localStorage.setItem(key, JSON.stringify(updatedStore));
      set(updatedStore);
    }
  };
};

// our custom user state store instance
export const user = (() => {
  /**
   * The underlying user state object, this wraps our two sources of user info (auth0 and fulcra api)
   * as well as provides getter properties for values we can derive from the user info objects
   * like authenticated, etc
   */
  const userState = {
    init: false, // boolean that tracks whether init() has successfully run

    // getter that returns a user's authenticated state based on values in the auth0/fulcra api info objects
    get authenticated() {
      // check auth0client.isAuthenticated() as well? have to yoink out an async result
      // TODO -- check fulcraUserInfo
      return 'fulcradynamics.com/userid' in this.auth0UserInfo;
    },

    auth0UserInfo: {}, // user info object from auth0
    fulcraUserInfo: {}, // user info object from fulcra api,

    // These are the only properties we want to persist, so only serialize those into JSON which then gets shoved into localstorage
    toJSON: function () {
      return {
        auth0UserInfo: this.auth0UserInfo,
        fulcraUserInfo: this.fulcraUserInfo
      };
    }
  };

  // create our underlying persisted writable store
  const { subscribe, set, update } = persistedObjectWritable('fulcraUserState', userState);

  // private client for auth0, init() will initialize this
  let auth0 = {};

  /**
   * Initializes a user session, this should be called at top level onMount
   * to set up auth0, etc
   */
  const _init = async () => {
    // create our auth0 Client
    auth0 = await createAuth0Client({
      domain: env.PUBLIC_AUTH0_DOMAIN,
      clientId: env.PUBLIC_AUTH0_CLIENT_ID,
      authorizationParams: {
        audience: env.PUBLIC_FULCRA_API_ENDPOINT
      }
    });

    // check for existing auth0 session, if we don't have one, clear our persisted userinfo
    if (!(await auth0.isAuthenticated())) {
      _clearUser();
    }

    // set init to true
    update((d) => {
      d.init = true;
      return d;
    });
  };

  // allow a user to attempt to log in
  const _login = async () => {
    try {
      await auth0.loginWithPopup();
    } catch (error) {
      // TODO handle these errors properly
      console.error(error);
      return;
    }

    // Store access token in HTTP-only cookie via server route
    const accessToken = await auth0.getTokenSilently();
    await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });

    await _getUser();
  };

  const _logout = async () => {
    // Clear the access token cookie
    await fetch('/api/auth/token', { method: 'DELETE' });
    await auth0.logout();
    _clearUser();
  };

  // grab user info from auth0 & fulcra api via server routes
  const _getUser = async () => {
    const userInfo = await auth0.getUser();

    // Call server route instead of Fulcra API directly
    const response = await fetch('/api/user/info');
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    const fulcraUserInfo = await response.json();

    update((d) => {
      d.auth0UserInfo = userInfo;
      d.fulcraUserInfo = fulcraUserInfo;
      return d;
    });
  };

  // clear user info
  const _clearUser = () => {
    update((d) => {
      d.auth0UserInfo = {};
      d.fulcraUserInfo = {};
      return d;
    });
  };

  // return our store object
  return {
    subscribe,
    set,
    update,
    init: _init,
    login: _login,
    logout: _logout
  };
})();
