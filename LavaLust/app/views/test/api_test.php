<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test - EduTrack</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: monospace;
            background: #1a1a1a;
            color: #0f0;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1 {
            color: #0f0;
            margin-bottom: 20px;
        }
        
        .test-section {
            background: #000;
            border: 1px solid #0f0;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        button {
            background: #0f0;
            color: #000;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            font-family: monospace;
            font-weight: bold;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        
        button:hover {
            background: #0f0;
            opacity: 0.8;
        }
        
        pre {
            background: #111;
            border: 1px solid #333;
            padding: 10px;
            margin-top: 10px;
            overflow-x: auto;
        }
        
        .success {
            color: #0f0;
        }
        
        .error {
            color: #f00;
        }
        
        .info {
            color: #ff0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 EduTrack API Test Console</h1>
        
        <div class="test-section">
            <h2>Database Connection Test</h2>
            <button onclick="testDatabase()">Test Database</button>
            <pre id="dbResult">Click button to test...</pre>
        </div>
        
        <div class="test-section">
            <h2>Registration Test</h2>
            <button onclick="testRegister()">Test Register</button>
            <pre id="registerResult">Click button to test...</pre>
        </div>
        
        <div class="test-section">
            <h2>Login Test</h2>
            <button onclick="testLogin()">Test Login</button>
            <pre id="loginResult">Click button to test...</pre>
        </div>
        
        <div class="test-section">
            <h2>Check Auth Test</h2>
            <button onclick="testCheck()">Test Check</button>
            <pre id="checkResult">Click button to test...</pre>
        </div>
        
        <div class="test-section">
            <h2>Get Current User Test</h2>
            <button onclick="testMe()">Test Me</button>
            <pre id="meResult">Click button to test...</pre>
        </div>
    </div>
    
    <script>
        function log(elementId, message, type = 'info') {
            const element = document.getElementById(elementId);
            const className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
            element.innerHTML = `<span class="${className}">${message}</span>`;
        }
        
        async function testDatabase() {
            log('dbResult', 'Testing database connection...', 'info');
            try {
                const response = await fetch('/api/auth/check', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const data = await response.json();
                log('dbResult', `✓ Database connection OK!\n\nResponse:\n${JSON.stringify(data, null, 2)}`, 'success');
            } catch (error) {
                log('dbResult', `✗ Database connection failed!\n\nError: ${error.message}`, 'error');
            }
        }
        
        async function testRegister() {
            log('registerResult', 'Testing registration...', 'info');
            
            const testUser = {
                email: `test_${Date.now()}@edutrack.com`,
                password: 'password123',
                first_name: 'Test',
                last_name: 'User',
                phone: '+1234567890',
                role: 'student'
            };
            
            try {
                // First test POST data reception
                const debugResponse = await fetch('/debug/test_post', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(testUser)
                });
                
                const debugData = await debugResponse.json();
                console.log('Debug POST test:', debugData);
                
                // Then try actual registration
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(testUser)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    log('registerResult', `✓ Registration successful!\n\nUser Data:\n${JSON.stringify(data, null, 2)}`, 'success');
                } else {
                    log('registerResult', `✗ Registration failed!\n\nResponse:\n${JSON.stringify(data, null, 2)}`, 'error');
                }
            } catch (error) {
                log('registerResult', `✗ Registration error!\n\nError: ${error.message}`, 'error');
            }
        }
        
        async function testLogin() {
            log('loginResult', 'Testing login...', 'info');
            
            const credentials = {
                email: 'admin@edutrack.com',
                password: 'password'
            };
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(credentials)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    log('loginResult', `✓ Login successful!\n\nUser Data:\n${JSON.stringify(data, null, 2)}`, 'success');
                } else {
                    log('loginResult', `✗ Login failed!\n\nResponse:\n${JSON.stringify(data, null, 2)}`, 'error');
                }
            } catch (error) {
                log('loginResult', `✗ Login error!\n\nError: ${error.message}`, 'error');
            }
        }
        
        async function testCheck() {
            log('checkResult', 'Checking authentication status...', 'info');
            try {
                const response = await fetch('/api/auth/check', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const data = await response.json();
                log('checkResult', `✓ Check successful!\n\nAuth Status:\n${JSON.stringify(data, null, 2)}`, 'success');
            } catch (error) {
                log('checkResult', `✗ Check error!\n\nError: ${error.message}`, 'error');
            }
        }
        
        async function testMe() {
            log('meResult', 'Getting current user...', 'info');
            try {
                const response = await fetch('/api/auth/me', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    log('meResult', `✓ User data retrieved!\n\nData:\n${JSON.stringify(data, null, 2)}`, 'success');
                } else {
                    log('meResult', `✗ Not authenticated!\n\nResponse:\n${JSON.stringify(data, null, 2)}`, 'error');
                }
            } catch (error) {
                log('meResult', `✗ Error!\n\nError: ${error.message}`, 'error');
            }
        }
    </script>
</body>
</html>
