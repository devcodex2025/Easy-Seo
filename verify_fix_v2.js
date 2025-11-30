async function verifyFix() {
    console.log('Testing API endpoint http://127.0.0.1:3000/api/payment/process...');
    try {
        const response = await fetch('http://127.0.0.1:3000/api/payment/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Payment': 'dummy-header-value'
            },
            body: JSON.stringify({
                transactionId: 'test-tx-id',
                userId: 'test-user-id'
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.error === 'Payment verification failed') {
            console.log('SUCCESS: Server received transactionId and userId (validation failed later as expected)');
        } else if (data.error && data.error.includes('required')) {
            console.log('FAILURE: Server still missing parameters');
        } else {
            console.log('Outcome:', data);
        }

    } catch (error) {
        console.error('Request failed:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

verifyFix();
