<?php
// Allow this test script to run standalone by defining the framework guard
if (!defined('PREVENT_DIRECT_ACCESS')) {
    // When included inside the LavaLust app the constant will already be defined.
    // For standalone testing we define it here to avoid the direct-access exit.
    define('PREVENT_DIRECT_ACCESS', true);
}

require 'app/helpers/mail_helper.php';
require 'app/helpers/email_templates_helper.php';

$to = 'jeizi.zamora@gmail.com';
$subject = 'EduTrack Test Email';
$body = generate_welcome_email('Test User', 'test@example.com', 'student', 'http://localhost:5174/auth');
$result = sendNotif($to, $subject, $body);
var_dump($result);