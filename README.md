# Fetch API with retryable

- When http response isn't received (status code = 0), request is always & infinitely retried.
- When http response is other than 5xx, request is never retried.
- Request is retried 5 times, if it's retryable.

## Retryable defination
- By default, GET, PUT and DELETE requests are retryable.
- By default, POST request isn't retrayble.
- User can specify explicitly whether a request is retryable or not through options `{ retryable: true }`; whenever options are specified, it's considered and default behaviour is ignored.

## Usage pattern

```javascript
import fetch from '@dreamworld/fetch';