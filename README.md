# Fetch API with retryable

- When http response isn't received (status code = 0), request is always & infinitely retried.
- When http response is other than 5xx, request is never retried.

## Retry

It automatically performs retry on various common errors. e.g.
- Network Error
- 503: Service Unavailable

> All 4xx errors are considered client errors, and they are NEVER retried.

### Don't retry 5xx except 503
Earlier we were performing retry on 500 errors too. But, all retries were failing with the same error. So, it was simply generating load (and errors) on the server; and not helping user. As an inverse effect, user need to wait for few seconds to see error.

So, we planned to not retry any of the 500 error.

Similarly, another common error is 504 - Gateway Timeout. This can happen when a service takes longer than 1 minute to respond. And any intermediate proxy (nginx or api-gateway) considers it as timeout and responds with 504. This error is not common, and most often suggests a change in the API design. If API is suppose to take longer to process; then it should respond with 201 - Accepted. And provide an companion API to read the status of the request. Additionally, retrying in this case can cause duplicate records on teh server (if it was write API). So, 504 error should also not be retried ever.

But, "503 - Service Unavailable" could be a temporary error. And if retry is performed for next 1-2 minute it should succeed once. 
As all microservices are deployed with high-availability setup, this error is also not expected ever. But, in rare case if it happens, it should be retried.

### Override default behaviour
User can specify explicitly whether a request is retryable or not through options `{ retryable: true }`; whenever options are specified, it's considered and default behaviour is ignored.

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
