# @dreamworld/fetch

A drop-in replacement for the native `fetch` API that adds automatic retry with exponential backoff, FormData upload progress tracking via `XMLHttpRequest`, and request cancellation via `AbortController`.

---

## 1. User Guide

### Installation & Setup

```bash
npm install @dreamworld/fetch
# or
yarn add @dreamworld/fetch
```

This package is an **ES Module** (`"type": "module"` in `package.json`). Use a bundler or environment that supports ES Modules.

**Run the interactive demo:**

```bash
yarn start
```

Launches `@web/dev-server` at the `demo/index.html` app index.

---

### Basic Usage

```javascript
import fetch from '@dreamworld/fetch';

// Simple GET request
const response = await fetch('/api/data');
const data = await response.json();

// POST with custom retry behavior
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' }),
  retryable: true
});
```

---

### API Reference

#### Main Function

```
fetch(url, options, maxAttempts, delay, offlineRetry)
```

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `url` | `string` | — | Yes | API endpoint URL |
| `options` | `object` | `{}` | No | Request configuration (see below) |
| `maxAttempts` | `number` | `5` | No | Maximum retry attempts for server errors |
| `delay` | `number` | `200` | No | Initial retry delay in ms; grows exponentially |
| `offlineRetry` | `boolean` | `true` | No | When `true`, retries infinitely on network errors |

**Returns:** `Promise` — resolves to a standard `Response` object for regular requests, or a Response-compatible object for FormData uploads (see [XHR Response Object](#xhr-response-object)).

---

#### `options` Object

Extends the standard [fetch `RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) with three additional properties:

| Property | Type | Description |
|---|---|---|
| `method` | `string` | HTTP method. Defaults to `'POST'` for FormData uploads via XHR. |
| `headers` | `object` | Request headers. `content-type` is automatically excluded when `body` is `FormData` (browser sets it with boundary). |
| `body` | `string \| FormData \| ...` | Request body. Passing `FormData` alongside `onUploadProgress` routes the request through `XMLHttpRequest`. |
| `retryable` | `boolean \| undefined` | Override default retry behavior. `true` = retry on any non-2xx; `false` = never retry; `undefined` (default) = retry only on HTTP 503. |
| `signal` | `AbortSignal` | `AbortSignal` from an `AbortController`, used to cancel the request. |
| `onUploadProgress` | `function` | Progress callback invoked during upload. **Only fires when `body` is `FormData`.** Signature: `({ sentBytes, totalBytes, percentage, speed }) => void` |

---

#### `onUploadProgress` Callback

```javascript
onUploadProgress: ({ sentBytes, totalBytes, percentage, speed }) => {
  console.log(`${Math.round(percentage * 100)}%`);
}
```

| Field | Type | Description |
|---|---|---|
| `sentBytes` | `number` | Total bytes uploaded so far |
| `totalBytes` | `number` | Total bytes to be uploaded (file content + all form fields) |
| `percentage` | `number` | Fractional value `0`–`1`, calculated as `sentBytes / totalBytes` |
| `speed` | `number` | **Always `0`.** Speed calculation is not yet implemented. |

> **Note:** `speed` is hardcoded to `0` in the current implementation. It is marked as a TODO for a future release.

---

#### XHR Response Object

When the request uses `XMLHttpRequest` (i.e., `body instanceof FormData && onUploadProgress` is set), the resolved value is a Response-compatible object — **not** a native `Response` instance:

| Property / Method | Type | Description |
|---|---|---|
| `status` | `number` | HTTP status code |
| `statusText` | `string` | HTTP status text |
| `ok` | `boolean` | `true` if `status` is `200`–`299` |
| `headers` | `Headers` | Parsed response headers |
| `text()` | `() => Promise<string>` | Returns raw response body as string |
| `json()` | `() => Promise<any>` | Parses and returns JSON body; rejects if parsing fails |

---

### Retry Logic

| Scenario | Behavior |
|---|---|
| **Network error** (no HTTP status, not a CORS error) | Retry every 2 seconds. Infinite retries if `offlineRetry=true`; single attempt if `offlineRetry=false`. |
| **HTTP 503** | Retry with exponential backoff up to `maxAttempts`. |
| **HTTP 2xx** | No retry. |
| **HTTP 4xx** | No retry. |
| **HTTP 5xx (non-503)** | No retry unless `retryable: true`. |
| **`retryable: true`** | Retry on any non-2xx response. |
| **`retryable: false`** | Never retry, regardless of status code. |
| **CORS errors** (`error.type === 'cors'`) | Not retried. Returned directly. |

**Exponential backoff formula:** `delay × 2^attempt`, capped at `5000ms`.

---

### Configuration Options

| Constant | Scope | Value | Description |
|---|---|---|---|
| `NETWORK_ERROR_RETRY_TIME` | Internal | `2000` ms | Fixed interval between retries during network errors |

These are internal constants and cannot be configured at runtime.

---

### Advanced Usage

#### File Upload with Progress

```javascript
import fetch from '@dreamworld/fetch';

const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');
formData.append('timestamp', new Date().toISOString());

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  onUploadProgress: ({ sentBytes, totalBytes, percentage, speed }) => {
    const pct = Math.round(percentage * 100);
    const sentMB = (sentBytes / (1024 * 1024)).toFixed(2);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    console.log(`${pct}% — ${sentMB} MB / ${totalMB} MB`);
    // speed is always 0 in current implementation
  }
});

const result = await response.json();
```

#### Request Cancellation

```javascript
import fetch from '@dreamworld/fetch';

const controller = new AbortController();

try {
  const response = await fetch('/api/data', {
    method: 'GET',
    signal: controller.signal,
    retryable: true
  });
  const data = await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    throw error;
  }
}

// Cancel from anywhere:
controller.abort();
```

#### Upload Cancellation

```javascript
const controller = new AbortController();
const formData = new FormData();
formData.append('file', fileInput.files[0]);

try {
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    signal: controller.signal,
    onUploadProgress: ({ percentage }) => {
      progressBar.value = Math.round(percentage * 100);
    }
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Upload cancelled');
  }
}

controller.abort(); // cancel
```

#### Custom Retry Parameters

```javascript
// Increase attempts for critical operations
const response = await fetch('/api/critical', {}, 10, 500);

// Reduce retries for user-initiated actions
const response = await fetch('/api/user-action', {}, 3, 100);

// Disable offline retry
const response = await fetch('/api/data', {}, 5, 200, false);
```

#### Timeout-based Cancellation

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

try {
  const response = await fetch('/api/slow-endpoint', { signal: controller.signal });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request timed out');
  }
}
```

---

## 2. Developer Guide / Architecture

### Architecture Overview

`@dreamworld/fetch` is structured as a **decorator over the native `fetch` API** — a transparent wrapper that augments it with retry and progress capabilities while maintaining API compatibility.

**Design patterns used:**

- **Decorator** — wraps native `fetch` without modifying its interface
- **Strategy** — request path is selected at runtime (XHR vs. native fetch) based on the presence of `FormData` body and `onUploadProgress`
- **Chain of Responsibility** — two retry layers are composed: network-level retry wraps server-level retry

**Module type:** ES Module (`"type": "module"`), single default export.

**Dependencies:**

| Package | Role |
|---|---|
| `@lifeomic/attempt` | Powers both retry loops (exponential backoff + fixed-interval) |
| `@dreamworld/pwa-helpers` | Listed as dependency; not referenced in the exported API surface |
| `lodash-es` | Listed as dependency; not referenced in the exported API surface |

---

### Request Routing

```
fetch(url, options, ...)
  │
  ├─ body instanceof FormData && onUploadProgress?
  │     YES → _uploadWithProgress() via XMLHttpRequest
  │     NO  → native fetch()
  │
  └─ wrapped in two retry layers:
        _retryFetch          (server errors, exponential backoff)
        _retryOnNetworkError (network errors, fixed 2s interval)
```

---

### Internal Functions

These functions are not exported. They are implementation details of `fetch.js`.

| Function | Signature | Responsibility |
|---|---|---|
| `_isRetryableError` | `(res, options) => boolean` | Returns `true` if the response/error should trigger a retry. Returns `false` for 2xx. Defaults to retry only on status 503; respects `options.retryable` override. |
| `_uploadWithProgress` | `(url, options) => Promise` | Performs the request via `XMLHttpRequest`. Handles `AbortSignal`, fires `onUploadProgress` on XHR progress events, and returns a Response-compatible object on load. Cleans up abort event listeners via a `cleanup()` closure to prevent memory leaks. |
| `_retryFetch` | `(url, options, maxAttempts, delay) => Promise` | Wraps the request (XHR or fetch) with exponential-backoff retry using `@lifeomic/attempt`. Aborts the retry loop for non-retryable errors. Strips `retryable` and `onUploadProgress` from the options passed to native `fetch`. |
| `_retryOnNetworkError` | `(url, options, maxAttempts, delay, offlineRetry) => Promise` | Outer retry layer for network-level failures (no HTTP status). Uses a fixed `2000ms` delay. When `offlineRetry=false`, sets `maxAttempts=1` (no retry). Delegates to `_retryFetch` when the server responds with a retryable status. |

---

### Memory Safety

`_uploadWithProgress` attaches an `abort` event listener to the provided `AbortSignal`. A `cleanup()` closure removes this listener after any terminal XHR event (`load`, `error`, `timeout`, `abort`) to prevent memory leaks in long-lived pages.
