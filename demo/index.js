import fetch from '../fetch.js';

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

  // Show progress bar and disable button
  progressBar.style.display = 'block';
  uploadBtn.disabled = true;
  progressFill.style.width = '0%';
  progressInfo.innerHTML = 'Starting upload...';
  resultDiv.innerHTML = '';

  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: formData,
      retryable: true,
      onUploadProgress: ({ sentBytes, totalBytes, percentage }) => {
        // Update progress bar
        const percentDisplay = Math.round(percentage * 100);
        progressFill.style.width = `${percentDisplay}%`;
        
        // Update progress info
        const sentMB = (sentBytes / (1024 * 1024)).toFixed(2);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        
        progressInfo.innerHTML = `
          <div>Progress: ${percentDisplay}%</div>
          <div>Uploaded: ${sentMB} MB / ${totalMB} MB</div>
          <div>Bytes: ${sentBytes} / ${totalBytes}</div>
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
    resultDiv.innerHTML = `<strong>Upload failed:</strong> ${error.message}`;
    progressInfo.innerHTML += `<div><strong>Error:</strong> ${error.message}</div>`;
  } finally {
    uploadBtn.disabled = false;
  }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('basic-test').addEventListener('click', testBasicFetch);
  document.getElementById('upload-btn').addEventListener('click', testFileUpload);
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