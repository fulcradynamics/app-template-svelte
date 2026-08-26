/**
 * Represents an authenticated HTTP client to the Fulcra Life API
 */
export class fulcraApiClient {
  constructor(endpoint, client) {
    this.endpoint = endpoint;
    this.client = client;
  }

  async request(method, path, data, signal) {
    const url = new URL(this.endpoint + path);

    let options = {
      signal: signal,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (await this.client.getTokenSilently())
      }
    };

    if (data != undefined) {
      options.body = JSON.stringify(data);
    }

    const resp = await fetch(url, options);

    // check for non-2xx status
    if (!resp.ok) {
      throw new Error(`Response status ${resp.status}`, { cause: resp });
    }

    if (resp.status === 204) {
      return;
    } else {
      return await resp.json();
    }
  }

  async get(path, signal) {
    return this.request('GET', path, undefined, signal);
  }

  async post(path, data) {
    return this.request('POST', path, data);
  }

  async put(path, data) {
    return this.request('PUT', path, data);
  }

  async delete(path) {
    return this.request('DELETE', path);
  }
}
