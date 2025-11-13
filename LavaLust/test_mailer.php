<?php
// Allow this test script to run standalone by defining the framework guard
if (!defined('PREVENT_DIRECT_ACCESS')) {
    // When included inside the LavaLust app the constant will already be defined.
    // For standalone testing we define it here to avoid the direct-access exit.
    define('PREVENT_DIRECT_ACCESS', true);
}

// Load the mail helper
require_once 'app/helpers/mail_helper.php';

// Check if form was submitted
$result = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $recipient = $_POST['recipient'] ?? '';
    $subject = $_POST['subject'] ?? 'Test Email from EduTrack';
    $testEmailBody = $_POST['body'] ?? 'This is a test email to verify the mailer is working correctly.';

    // Validate email
    if (empty($recipient)) {
        $error = 'Please enter a recipient email address.';
    } elseif (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email address.';
    } else {
        // Send test email
        $result = sendNotif($recipient, $subject, $testEmailBody);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EduTrack - Mail Tester</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            width: 100%;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
        }

        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .header p {
            font-size: 14px;
            opacity: 0.9;
        }

        .content {
            padding: 40px 30px;
        }

        .form-group {
            margin-bottom: 25px;
        }

        .form-group label {
            display: block;
            color: #333;
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-family: inherit;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 120px;
        }

        .submit-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:active {
            transform: translateY(0);
        }

        .alert {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 25px;
            font-size: 14px;
            border-left: 4px solid;
        }

        .alert-success {
            background: #d4edda;
            color: #155724;
            border-color: #28a745;
        }

        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border-color: #f5c6cb;
        }

        .alert-info {
            background: #d1ecf1;
            color: #0c5460;
            border-color: #bee5eb;
        }

        .info-box {
            background: #f8f9ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 25px;
            font-size: 13px;
            color: #666;
            line-height: 1.6;
        }

        .info-box strong {
            color: #667eea;
        }

        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 EduTrack Mailer Test</h1>
            <p>Test if the email notification system is working correctly</p>
        </div>

        <div class="content">
            <?php if ($result): ?>
                <?php if ($result['success']): ?>
                    <div class="alert alert-success">
                        <strong>✓ Success!</strong><br>
                        <?php echo htmlspecialchars($result['message']); ?>
                    </div>
                <?php else: ?>
                    <div class="alert alert-error">
                        <strong>✗ Error!</strong><br>
                        <?php echo htmlspecialchars($result['message']); ?>
                    </div>
                <?php endif; ?>
            <?php endif; ?>

            <?php if ($error): ?>
                <div class="alert alert-error">
                    <strong>✗ Validation Error</strong><br>
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <div class="info-box">
                <strong>ℹ️ Instructions:</strong><br>
                Enter a recipient email address and test message, then click "Send Test Email" to verify the mailer is working correctly. Check the recipient's inbox (and spam folder) for the test email.
            </div>

            <form method="POST" action="">
                <div class="form-group">
                    <label for="recipient">Recipient Email Address *</label>
                    <input 
                        type="email" 
                        id="recipient" 
                        name="recipient" 
                        placeholder="test@example.com"
                        value="<?php echo htmlspecialchars($_POST['recipient'] ?? ''); ?>"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="subject">Email Subject (Optional)</label>
                    <input 
                        type="text" 
                        id="subject" 
                        name="subject" 
                        placeholder="Test Email from EduTrack"
                        value="<?php echo htmlspecialchars($_POST['subject'] ?? 'Test Email from EduTrack'); ?>"
                    >
                </div>

                <div class="form-group">
                    <label for="body">Email Body (Optional)</label>
                    <textarea 
                        id="body" 
                        name="body" 
                        placeholder="Enter your test message here..."
                    ><?php echo htmlspecialchars($_POST['body'] ?? 'This is a test email to verify the mailer is working correctly.'); ?></textarea>
                </div>

                <button type="submit" class="submit-btn">Send Test Email</button>
            </form>
        </div>

        <div class="footer">
            <p>EduTrack Mail Testing Interface | For Development Use Only</p>
            <p>Check your email settings in app/helpers/mail_helper.php if emails are not being sent</p>
        </div>
    </div>
</body>
</html>
