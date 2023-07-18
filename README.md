# Fetch API with retryable

- When http response isn't received (status code = 0), request is always & infinitely retried.
- When http response is other than 5xx, request is never retried.

## Retryable defination

- User can specify explicitly whether a request is retryable or not through options `{ retryable: true }`; whenever options are specified, it's considered and default behaviour is ignored.

## Usage pattern

```javascript
import fetch from '@dreamworld/fetch';
```

### Get Pending write / read requests

```js
// store.js
import { initRedux as initFetchRequestRedux } from '@dreamworld/fetch';
initFetchRequestRedux(store);

// Get Pending writes / reads.
import * as fetchSelectors from '@dreamworld/fetch/selectors.js';

fetchSelectors.pendingWrites(state); // { 5AqmtnIKAReGLCeUFcvj5b: 1689319833142, ... }

fetchSelectors.pendingReads(state); // { 9BqmtnIKAReGLCeUFcvj5b: 1689319833142, ... }
```
