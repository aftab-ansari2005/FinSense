const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUploadEndpoint() {
  try {
    // Test 1: Check if the endpoint exists (should return 401 for unauthorized)
    console.log('Testing upload endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/transactions/upload', {}, {
      validateStatus: function (status) {
        return status < 500; // Accept any status less than 500
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testUploadEndpoint();