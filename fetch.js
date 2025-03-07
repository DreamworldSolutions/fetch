import { retry } from '@lifeomic/attempt';
const NETWORK_ERROR_RETRY_TIME = 2000; //In milliseconds.

/**
 * It returns true if request is retryable, false otherwise.
 */
const _isRetryableError = (res, options) => {
  if(res.status >= 200 && res.status <= 299) return false;

  let retryable = options.retryable ?? (res.status && res.status == 503);
  return !!retryable ? true : false;
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
  try {
    return await _retryFetch(url, options, maxAttempts, delay);
  } catch (error) {
    if (!error.status && error.type !== 'cors') {
      return await _retryOnNetworkError(url, options, maxAttempts, delay, offlineRetry);
    }

    return error;
  }
};
