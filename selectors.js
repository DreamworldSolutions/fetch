import get from 'lodash-es/get.js';

/**
 * It returns Pending write requests.
 * @param {Object} state
 * @returns {String}
 */
export const pendingWrites = state => {
  return get(state, `fetch-requests.pendingWrites`);
};

/**
 * It returns Peinding read requests.
 * @param {Object} state
 * @returns {Boolean}
 */
export const pendingReads = state => {
  return get(state, `fetch-requests.pendingReads`);
};
