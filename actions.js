/**
 * Dispatched whenever fetch request is sent.
 */
export const REQUEST = 'FETCH_REQUEST_START';

/**
 * Dispatched whenever request is succeed.
 */
export const REQUEST_SUCCEED = 'FETCH_REQUEST_SUCCEED';

/**
 * Dispatched whenever request is failed due to server error.
 */
export const REQUEST_FAILED = 'FETCH_REQUEST_FAILED';

/**
 * Stores request time into state.
 * @param {String} requestId uuid (base62)
 * @param {String} requestType Possible values: 'read' or 'write'
 */
export const request = (requestId, requestType) => {
  return {
    type: REQUEST,
    requestId,
    requestType,
  };
};

/**
 * Removes pending write/read request from state.
 * @param {String} requestId uuid (base62)
 * @param {String} requestType Possible values: 'read' or 'write'
 */
export const requestSucceed = (requestId, requestType) => {
  return {
    type: REQUEST_SUCCEED,
    requestId,
    requestType,
  };
};

/**
 * Removes pending write/read request from state.
 * @param {String} requestId uuid (base62)
 * @param {String} requestType Possible values: 'read' or 'write'
 */
export const requestFailed = (requestId, requestType) => {
  return {
    type: REQUEST_FAILED,
    requestId,
    requestType,
  };
};
