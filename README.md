# @dreamworld/fetch

A robust fetch wrapper with automatic retry logic, file upload progress tracking, and request cancellation support.

## Features

- ✅ **Automatic Retry**: Smart retry logic for network errors and specific HTTP status codes
- ✅ **File Upload Progress**: Real-time upload progress tracking for FormData uploads
- ✅ **Request Cancellation**: Cancel requests using AbortController API
- ✅ **Speed Calculation**: Upload speed monitoring with smoothed averages
- ✅ **Response Compatibility**: Maintains fetch API compatibility

## Installation

```bash
npm install @dreamworld/fetch
```

## Basic Usage

```javascript
import fetch from '@dreamworld/fetch';

// Simple GET request
const response = await fetch('/api/data');
const data = await response.json();

// POST request with retry options
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' }),
  retryable: true
});
```

## File Upload with Progress

When uploading files using FormData, the library automatically switches to XMLHttpRequest to support progress tracking:

```javascript
import fetch from '@dreamworld/fetch';

const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  onUploadProgress: ({ percentage, speed, sentBytes, totalBytes }) => {
    console.log(`Progress: ${Math.round(percentage * 100)}%`);
    console.log(`Speed: ${formatSpeed(speed)}`);
    console.log(`Uploaded: ${sentBytes} / ${totalBytes} bytes`);
  }
});

function formatSpeed(bytesPerSecond) {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  } else if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
  } else {
    return `${bytesPerSecond} B/s`;
  }
}
```

### Progress Callback Parameters

The `onUploadProgress` callback receives an object with:

- **`percentage`**: A number between 0 and 1 representing upload completion (sentBytes / totalBytes)
- **`speed`**: Upload speed in bytes per second (smoothed average of last 10 samples)
- **`sentBytes`**: Total bytes uploaded so far
- **`totalBytes`**: Total bytes to be uploaded (includes file content + form data)

## Request Cancellation

Cancel requests using the standard AbortController API:

### Basic Cancellation

```javascript
import fetch from '@dreamworld/fetch';

const controller = new AbortController();
const signal = controller.signal;

try {
  const response = await fetch('/api/data', {
    method: 'GET',
    signal: signal,
    retryable: true
  });
  
  const data = await response.json();
  console.log('Success:', data);
  
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    console.error('Other error:', error);
  }
}

// Cancel the request from anywhere
controller.abort();
```

### File Upload Cancellation

```javascript
const controller = new AbortController();
const formData = new FormData();
formData.append('file', fileInput.files[0]);

try {
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    signal: controller.signal,
    onUploadProgress: ({ percentage, speed }) => {
      updateProgressBar(percentage);
      updateSpeedDisplay(speed);
    }
  });
  
  console.log('Upload successful');
  
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Upload was cancelled');
  } else {
    console.error('Upload failed:', error);
  }
}

// Cancel the upload
controller.abort();
```

### Timeout-based Cancellation

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort();
}, 30000); // 30 second timeout

try {
  const response = await fetch('/api/slow-endpoint', {
    signal: controller.signal
  });
  
  clearTimeout(timeoutId); // Clear timeout on success
  console.log('Request completed within timeout');
  
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request timed out');
  }
}
```

## Retry Logic

The library implements intelligent retry logic with the following behavior:

### Automatic Retry Scenarios

- **Network Errors**: When no HTTP response is received (status code = 0), requests are retried infinitely with 2-second intervals
- **503 Service Unavailable**: Temporary server unavailability is retried with exponential backoff

### No Retry Scenarios

- **2xx Success**: Successful responses (200-299) are never retried
- **4xx Client Errors**: Client errors (400-499) are never retried as they indicate client-side issues
- **5xx Server Errors** (except 503): Server errors like 500 and 504 are not retried to avoid server load and duplicate operations

### Custom Retry Behavior

Override default retry behavior using the `retryable` option:

```javascript
// Force retry on any non-2xx response
const response = await fetch('/api/data', {
  method: 'POST',
  retryable: true
});

// Disable retry completely
const response = await fetch('/api/data', {
  method: 'POST',
  retryable: false
});
```

### Retry Parameters

```javascript
const response = await fetch(url, options, maxAttempts, delay, offlineRetry);
```

- **`maxAttempts`** (default: 5): Maximum number of retry attempts
- **`delay`** (default: 200ms): Initial delay between retries (grows exponentially)
- **`offlineRetry`** (default: true): Whether to retry infinitely during network errors

## API Reference

### Main Function

```javascript
fetch(url, options, maxAttempts, delay, offlineRetry)
```

**Parameters:**
- `url` (string): The request URL
- `options` (object): Request options
- `maxAttempts` (number, optional): Maximum retry attempts (default: 5)
- `delay` (number, optional): Initial retry delay in ms (default: 200)
- `offlineRetry` (boolean, optional): Enable infinite retry for network errors (default: true)

### Options Object

```javascript
{
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | ...,
  headers: { ... },
  body: string | FormData | ...,
  retryable: boolean,           // Override default retry behavior
  signal: AbortSignal,          // For request cancellation
  onUploadProgress: function    // Progress callback for FormData uploads
}
```

### Response Object

For regular requests, returns standard [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object.

For FormData uploads with progress tracking, returns a Response-compatible object with:
- `status`, `statusText`, `ok`
- `headers` (Headers instance)
- `text()`, `json()` methods

## Error Handling

### Retry Errors

```javascript
try {
  const response = await fetch('/api/data');
} catch (error) {
  // All retries exhausted
  console.error('Request failed after retries:', error);
}
```

### Cancellation Errors

```javascript
try {
  const response = await fetch('/api/data', { signal });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    console.error('Other error:', error);
  }
}
```

### Upload Errors

```javascript
try {
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    onUploadProgress: ({ percentage }) => {
      console.log(`${Math.round(percentage * 100)}% uploaded`);
    }
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Upload cancelled');
  } else {
    console.error('Upload failed:', error);
  }
}
```

## Browser Support

- **Modern Browsers**: Full support for all features
- **AbortController**: Required for cancellation (available in all modern browsers)
- **FormData**: Required for upload progress tracking
- **XMLHttpRequest**: Used internally for upload progress

For older browsers, consider using polyfills:

```bash
npm install abortcontroller-polyfill
```

```javascript
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
```

## Best Practices

### 1. Always Handle Cancellation Explicitly

```javascript
try {
  const response = await fetch(url, { signal });
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle cancellation differently from other errors
    console.log('Operation cancelled by user');
    return;
  }
  throw error; // Re-throw other errors
}
```

### 2. Cleanup Controllers

```javascript
let controller = new AbortController();

const cleanup = () => {
  if (controller) {
    controller.abort();
    controller = null;
  }
};

// Cleanup on component unmount, route change, etc.
```

### 3. Provide User Feedback

```javascript
const uploadFile = async (file) => {
  const controller = new AbortController();
  
  try {
    showProgress(true);
    
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      onUploadProgress: ({ percentage, speed }) => {
        updateProgress(percentage, speed);
      }
    });
    
    showSuccess('Upload completed!');
    
  } catch (error) {
    if (error.name === 'AbortError') {
      showMessage('Upload cancelled');
    } else {
      showError('Upload failed: ' + error.message);
    }
  } finally {
    hideProgress();
  }
};
```

### 4. Use Appropriate Retry Settings

```javascript
// For critical operations, increase retry attempts
const response = await fetch('/api/critical-data', {}, 10, 500);

// For user-initiated actions, reduce retries
const response = await fetch('/api/user-action', {}, 3, 100);

// For background operations, allow infinite network retries
const response = await fetch('/api/background-sync', {}, 5, 200, true);
```

## Demo

Run the interactive demo to see all features in action:

```bash
yarn start
```

The demo showcases:
- Basic fetch requests with retry
- File upload with real-time progress tracking
- Request cancellation examples
- Error handling patterns

## Migration from Standard Fetch

The library is designed as a drop-in replacement for the standard fetch API:

```javascript
// Before
const response = await fetch('/api/data');

// After - same syntax, enhanced functionality
import fetch from '@dreamworld/fetch';
const response = await fetch('/api/data');
```

Additional features are opt-in and don't affect existing usage patterns.
