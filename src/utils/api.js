import HTTPError from './http-error.js';
import {getProxyUrl} from './proxy.js';

const API_ENDPOINT = 'https://api.betterttv.net/3/';

function request(method, path, options = {}) {
  const {searchParams, force} = options;
  delete options.searchParams;
  delete options.force;

  const proxyUrl = getProxyUrl();
  const params = new URLSearchParams(searchParams);
  if (force) {
    params.set('_t', Date.now());
  }
  const queryString = params.toString();
  const fullUrl = `${proxyUrl}${API_ENDPOINT}${path}${queryString ? `?${queryString}` : ''}`;

  return fetch(fullUrl, {
    method,
    ...options,
  }).then(async (response) => {
    if (response.ok) {
      return response.json();
    }

    let responseJSON;
    try {
      responseJSON = await response.json();
    } catch (err) {
      throw new HTTPError(response.status, null);
    }

    throw new HTTPError(response.status, responseJSON);
  });
}

export default {
  get(path, options) {
    return request('GET', path, options);
  },

  post(path, options) {
    return request('POST', path, options);
  },

  put(path, options) {
    return request('PUT', path, options);
  },

  patch(path, options) {
    return request('PATCH', path, options);
  },

  delete(path, options) {
    return request('DELETE', path, options);
  },
};
