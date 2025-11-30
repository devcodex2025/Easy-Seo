import axios from 'axios';

async function verifyFix() {
    console.log('Testing API endpoint...');
    try {
        // We expect this to fail with "Payment verification failed" or similar, 
        // NOT "transactionId or userId is required"
        const response = await axios.post('http://localhost:3000/api/payment/process',
            {
                transactionId: 'test-tx-id',
                userId: 'test-user-id'
            },
            {
                headers: { 'X-Payment': 'dummy-header-value' }
            }
        );
        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Server responded with:', error.response.status, error.response.data);
        } else {
            console.error('Request failed:', error.message);
        }
    }
}

verifyFix();
