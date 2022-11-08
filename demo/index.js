import fetch from '../fetch.js';

const test = async () => {
  let res = await fetch('http://localhost:5000/post-test', { method: "POST", retryable: true });
  res = await res.json();
  console.log(res);
};

test();