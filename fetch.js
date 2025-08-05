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
 * Performs XMLHttpRequest-based upload with progress tracking support.
 * Used when body is FormData and onUploadProgress callback is provided.
 * @param {String} url API endpoint url
 * @param {Object} options Request options including FormData body and onUploadProgress
 * @returns {Promise} Promise that resolves to Response-like object
 */
const _uploadWithProgress = (url, options) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const { method = 'POST', headers = {}, body, onUploadProgress } = options;

    // Set up the request
    xhr.open(method.toUpperCase(), url, true);

    // Set headers (excluding content-type for FormData - browser sets it automatically with boundary)
    Object.keys(headers).forEach(key => {
      if (key.toLowerCase() !== 'content-type') {
        xhr.setRequestHeader(key, headers[key]);
      }
    });

    // Track upload progress if callback is provided
    if (onUploadProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const sentBytes = event.loaded;
          const totalBytes = event.total;
          const percentage = totalBytes > 0 ? sentBytes / totalBytes : 0;
          
          // Call the progress callback with the required parameters
          onUploadProgress({
            sentBytes,
            totalBytes,
            percentage,
            speed: 0 // TODO: Implement speed calculation in future enhancement
          });
        }
      });
    }

    // Handle successful response
    xhr.addEventListener('load', () => {
      // Create a Response-like object to maintain compatibility with fetch API
      const response = {
        status: xhr.status,
        statusText: xhr.statusText,
        ok: xhr.status >= 200 && xhr.status < 300,
        headers: new Headers(),
        text: () => Promise.resolve(xhr.responseText),
        json: () => {
          try {
            return Promise.resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            return Promise.reject(e);
          }
        }
      };

      // Parse response headers
      xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
        const parts = line.split(': ');
        if (parts.length === 2) {
          response.headers.set(parts[0], parts[1]);
        }
      });

      resolve(response);
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      const error = new Error('Network Error');
      error.type = 'network';
      reject(error);
    });

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      const error = new Error('Request Timeout');
      error.type = 'timeout';
      reject(error);
    });

    // Send the request
    xhr.send(body);
  });
};

/**
 * Retries server requests until it resolved.
 * @param {String} url API endpoint url
 * @param {Object} options Request options. It contains `retryable` and potentially `onUploadProgress`
 * @param {Number} maxAttempts Maximum retry attempt. Default is 5
 * @param {Number} delay delay between retry. Default is 200.
 * @returns {Promise}
 */
const _retryFetch = async (url, options, maxAttempts, delay) => {
  let opts = { ...options };
  delete opts['retryable'];

  return await retry(
    async () => {
      let res;
      
      // Use XMLHttpRequest for FormData uploads to support progress tracking
      if (opts.body instanceof FormData && opts.onUploadProgress) {
        res = await _uploadWithProgress(url, opts);
      } else {
        // Remove onUploadProgress from opts for regular fetch as it's not supported
        const fetchOpts = { ...opts };
        delete fetchOpts['onUploadProgress'];
        res = await fetch(url, fetchOpts);
      }

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
 * @param {Object} options Request options. It contains `retryable` and potentially `onUploadProgress`
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
        let res;
        
        // Use XMLHttpRequest for FormData uploads to support progress tracking
        if (opts.body instanceof FormData && opts.onUploadProgress) {
          res = await _uploadWithProgress(url, opts);
        } else {
          // Remove onUploadProgress from opts for regular fetch as it's not supported
          const fetchOpts = { ...opts };
          delete fetchOpts['onUploadProgress'];
          res = await fetch(url, fetchOpts);
        }

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
 * @param {Object} options Request options. It contains `retryable` and `onUploadProgress`
 *   - retryable: Boolean indicating if request should be retried on certain status codes
 *   - onUploadProgress: Function callback for FormData uploads with signature ({speed, totalBytes, sentBytes, percentage}) => {}
 *   - body: When specified as FormData, request is sent using XMLHttpRequest for progress tracking
 *   - method: HTTP method (default: POST for FormData uploads)
 *   - headers: Request headers (content-type is automatically set for FormData)
 * @param {Number} maxAttempts Maximum retry attempt. Default is 5
 * @param {Number} delay delay between retry. Default is 200.
 * @param {Boolean} offlineRetry whether it should retry in offline or not. Default is true.
 * @returns {Promise} Promise that resolves to Response object (for regular fetch) or Response-like object (for XMLHttpRequest uploads)
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
