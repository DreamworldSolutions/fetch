import { retry } from '@lifeomic/attempt';
import reducer from './reducer.js';
import * as actions from './actions.js';
import { uuidBase62 } from '@dreamworld/uuid-base62';
let store;
const NETWORK_ERROR_RETRY_TIME = 2000; //In milliseconds.

/**
 * @param {Object} res Response received from the server.
 * @return {Boolean} True if response is server error, false otherwise.
 */
const _isServerError = res => {
  return res.status && res.status >= 500 && res.status <= 599;
};

/**
 * It returns true if request is retryable, false otherwise.
 */
const _isRetryableError = (res, options) => {
  /* let method = options.method || 'GET';
  let retryable = options.retryable ?? ((['GET', 'PUT', 'DELETE'].indexOf(method) !== -1 && true) || false);

  if (!_isServerError(res)) {
    return false;
  }

  if (retryable) {
    return true;
  } */

  return !!options.retryable;
};

/**
 * Retries server requests until it resolved.
 * @param {String} url API endpoint url
 * @param {Object} options Request options. It contains `retryable`
 * @param {Number} maxAttempts Maximum retry attempt. Default is 5
 * @param {Number} delay delay between retry. Default is 200.
 * @returns {Promise}
 */
const _retryFetch = async (url, options, maxAttempts, delay) => {
  let opts = { ...options };
  delete opts['retryable'];

  return await retry(
    async () => {
      let res = await fetch(url, opts);

      if (_isRetryableError(res, options)) {
        throw res;
      }

      if (store) {
        store.dispatch(actions.requestSucceed(options.requestId, options.requestType));
      }
      return res;
    },
    {
      delay,
      factor: 2,
      maxDelay: 5000,
      maxAttempts,
      handleError(err, context) {
        if (_isRetryableError(err, options)) {
          console.warn(`_retryFetch: failed. It will be retried. attempt=${context.attemptNum + 1}, url=${url}. error=`, err);
          return;
        }

        if (store) {
          store.dispatch(actions.requestFailed(options.requestId, options.requestType));
        }
        context.abort();
      },
    }
  );
};

/**
 * It retries request infinitely if it failed with network error.
 * @param {String} url API endpoint url
 * @param {Object} options Request options. It contains `retryable`
 * @param {Number} maxAttempts Maximum retry attempt.
 * @param {Number} delay delay between retry.
 * @param {Boolean} offlineRetry whether it should retry in offline or not.
 * @returns {Promise}
 */
const _retryOnNetworkError = async (url, options, maxAttempts, delay, offlineRetry) => {
  let opts = { ...options };
  delete opts['retryable'];

  return await retry(
    async () => {
      try {
        let res = await fetch(url, options);

        if (_isRetryableError(res, options)) {
          return await _retryFetch(url, options, maxAttempts, delay);
        }

        return res;
      } catch (error) {
        if (!error.status) {
          throw error;
        }

        return error;
      }
    },
    { delay: NETWORK_ERROR_RETRY_TIME, maxAttempts: !offlineRetry ? 1 : 0 }
  );
};

/**
 * It retry fetch request internally if if failed due to network error
 * @param {String} url API endpoint url
 * @param {Object} options Request options. It contains `retryable`
 * @param {Number} maxAttempts Maximum retry attempt. Default is 5
 * @param {Number} delay delay between retry. Default is 200.
 * @param {Boolean} offlineRetry whether it should retry in offline or not. Default is true.
 * @returns {Promise}
 */
export default async (url, options = {}, maxAttempts = 5, delay = 200, offlineRetry = true) => {
  if (store) {
    options.requestId = uuidBase62();
    const method = options.method || 'GET';
    options.requestType = options.read || method === 'GET' ? 'read' : 'write';
    store.dispatch(actions.request(options.requestId, options.requestType));
  }
  try {
    return await _retryFetch(url, options, maxAttempts, delay);
  } catch (error) {
    if (!error.status) {
      return await _retryOnNetworkError(url, options, maxAttempts, delay, offlineRetry);
    }

    return error;
  }
};

export const initRedux = _store => {
  store = _store;

  store.addReducers({
    'fetch-requests': reducer,
  });
};
