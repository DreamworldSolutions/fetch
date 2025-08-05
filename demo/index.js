import fetch from '../fetch.js';

// Global variables for cancellation
let uploadController = null;
let longRequestController = null;

// Basic fetch test
const testBasicFetch = async () => {
  const resultDiv = document.getElementById('basic-result');
  resultDiv.innerHTML = 'Testing...';
  
  try {
    // Test with a public API that supports CORS
    const res = await fetch('https://httpbin.org/json', { 
      method: "GET", 
      retryable: true 
    });
    const data = await res.json();
    resultDiv.innerHTML = `<strong>Success:</strong> <pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (error) {
    resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
  }
};

// File upload with progress test
const testFileUpload = async () => {
  const fileInput = document.getElementById('file-input');
  const textField = document.getElementById('text-field');
  const uploadBtn = document.getElementById('upload-btn');
  const progressBar = document.querySelector('.progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressInfo = document.getElementById('progress-info');
  const resultDiv = document.getElementById('upload-result');

  if (!fileInput.files.length) {
    alert('Please select at least one file');
    return;
  }

  // Prepare FormData
  const formData = new FormData();
  
  // Add files to FormData
  Array.from(fileInput.files).forEach((file, index) => {
    formData.append(`file${index}`, file);
  });
  
  // Add text data
  if (textField.value) {
    formData.append('text', textField.value);
  }
  
  // Add additional form data for testing
  formData.append('timestamp', new Date().toISOString());
  formData.append('user', 'demo-user');

  // Create AbortController for cancellation
  uploadController = new AbortController();
  const signal = uploadController.signal;

  // Show progress bar and update button states
  progressBar.style.display = 'block';
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';
  document.getElementById('cancel-btn').style.display = 'inline-block';
  progressFill.style.width = '0%';
  progressInfo.innerHTML = 'Starting upload...';
  resultDiv.innerHTML = '';

  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: formData,
      retryable: true,
      signal: signal, // Add AbortController signal
      onUploadProgress: ({ sentBytes, totalBytes, percentage, speed }) => {
        // Update progress bar
        const percentDisplay = Math.round(percentage * 100);
        progressFill.style.width = `${percentDisplay}%`;
        
        // Format file sizes and speed for display
        const sentMB = (sentBytes / (1024 * 1024)).toFixed(2);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        
        // Format speed in human-readable format
        let speedDisplay = '';
        if (speed > 0) {
          if (speed >= 1024 * 1024) {
            speedDisplay = `${(speed / (1024 * 1024)).toFixed(2)} MB/s`;
          } else if (speed >= 1024) {
            speedDisplay = `${(speed / 1024).toFixed(2)} KB/s`;
          } else {
            speedDisplay = `${speed} B/s`;
          }
        } else {
          speedDisplay = 'Calculating...';
        }
        
        // Update progress info with enhanced display
        progressInfo.innerHTML = `
          <div>Progress: ${percentDisplay}%</div>
          <div>Uploaded: ${sentMB} MB / ${totalMB} MB</div>
          <div>Speed: ${speedDisplay}</div>
          <div>Bytes: ${sentBytes.toLocaleString()} / ${totalBytes.toLocaleString()}</div>
        `;
      }
    });

    const result = await response.json();
    
    resultDiv.innerHTML = `
      <strong>Upload successful!</strong>
      <details>
        <summary>Server Response</summary>
        <pre>${JSON.stringify(result, null, 2)}</pre>
      </details>
    `;
    
    progressInfo.innerHTML += '<div><strong>Upload completed successfully!</strong></div>';
    
  } catch (error) {
    if (error.name === 'AbortError') {
      resultDiv.innerHTML = `<strong>Upload cancelled by user</strong>`;
      progressInfo.innerHTML += `<div><strong>Upload was cancelled</strong></div>`;
    } else {
      resultDiv.innerHTML = `<strong>Upload failed:</strong> ${error.message}`;
      progressInfo.innerHTML += `<div><strong>Error:</strong> ${error.message}</div>`;
    }
  } finally {
    // Reset button states
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload Files';
    document.getElementById('cancel-btn').style.display = 'none';
    uploadController = null;
  }
};

// Cancel upload
const cancelUpload = () => {
  if (uploadController) {
    uploadController.abort();
  }
};

// Long request test for cancellation demo
const testLongRequest = async () => {
  const longRequestBtn = document.getElementById('long-request-btn');
  const cancelRequestBtn = document.getElementById('cancel-request-btn');
  const resultDiv = document.getElementById('long-request-result');

  // Create AbortController for cancellation
  longRequestController = new AbortController();
  const signal = longRequestController.signal;

  // Update UI
  longRequestBtn.disabled = true;
  longRequestBtn.textContent = 'Request in progress...';
  cancelRequestBtn.style.display = 'inline-block';
  resultDiv.innerHTML = 'Making long request (10 seconds delay)...';

  try {
    const response = await fetch('https://httpbin.org/delay/10', {
      method: 'GET',
      signal: signal,
      retryable: true
    });

    const data = await response.json();
    resultDiv.innerHTML = `<strong>Long request completed!</strong><pre>${JSON.stringify(data, null, 2)}</pre>`;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      resultDiv.innerHTML = `<strong>Request cancelled by user</strong>`;
    } else {
      resultDiv.innerHTML = `<strong>Request failed:</strong> ${error.message}`;
    }
  } finally {
    // Reset button states
    longRequestBtn.disabled = false;
    longRequestBtn.textContent = 'Start Long Request (10s)';
    cancelRequestBtn.style.display = 'none';
    longRequestController = null;
  }
};

// Cancel long request
const cancelLongRequest = () => {
  if (longRequestController) {
    longRequestController.abort();
  }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('basic-test').addEventListener('click', testBasicFetch);
  document.getElementById('upload-btn').addEventListener('click', testFileUpload);
  document.getElementById('cancel-btn').addEventListener('click', cancelUpload);
  document.getElementById('long-request-btn').addEventListener('click', testLongRequest);
  document.getElementById('cancel-request-btn').addEventListener('click', cancelLongRequest);
});

// Initial basic test
const initialTest = async () => {
  console.log('Running initial test...');
  try {
    // Test basic functionality
    const res = await fetch('https://httpbin.org/get', { method: "GET", retryable: true });
    const data = await res.json();
    console.log('Initial test successful:', data);
  } catch (error) {
    console.error('Initial test failed:', error);
  }
};

initialTest();