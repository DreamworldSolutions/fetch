import { REQUEST, REQUEST_SUCCEED, REQUEST_FAILED } from './actions.js';
import { ReduxUtils } from '@dreamworld/pwa-helpers/redux-utils.js';

export default (state = {}, action) => {
  const requestType = action.requestType === 'read' ? 'pendingReads' : 'pendingWrites';

  switch (action.type) {
    case REQUEST:
      return ReduxUtils.replace(state, `${requestType}.${action.requestId}`, Date.now());

    case REQUEST_SUCCEED:
    case REQUEST_FAILED:
      return ReduxUtils.replace(state, `${requestType}.${action.requestId}`, undefined);

    default:
      return state;
  }
};
