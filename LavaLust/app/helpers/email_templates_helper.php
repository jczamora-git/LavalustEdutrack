<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Helper: email_templates_helper.php
 *
 * Centralized email template generation for all notification emails.
 * Keeps templates separated from controller logic and makes it easy to manage
 * multiple email templates without cluttering the controller.
 */

/**
 * Generate welcome email HTML template for new user registration
 *
 * @param string $firstName User's first name
 * @param string $email User's email address
 * @param string $role User's role (student, teacher, admin)
 * @param string $portalUrl Base URL of the portal
 * @param string $logoUrl URL to the EduTrack logo
 * @return string HTML email template
 */
function generate_welcome_email($firstName, $email, $role, $portalUrl = '', $logoUrl = '')
{
    $roleDisplay = ucfirst($role);
    
    // Set defaults if not provided
    if (empty($portalUrl)) {
        $portalUrl = 'http://localhost:5174/auth';
    }

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f9fafb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <!-- Hero Section with Modern Gradient -->
        <tr>
            <td style="background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); padding: 60px 24px; text-align: center; color: #ffffff; border-radius: 12px 12px 0 0;">
                <!-- Logo Text -->
                    <!-- Logo (embedded CID image) -->
                    <img src="cid:edu_logo" alt="EduTrack logo" style="max-width:140px; height:auto; display:block; margin:0 auto 24px auto;" />
                <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; line-height: 1.2;">Welcome Aboard! 🚀</h1>
                <p style="font-size: 15px; opacity: 0.95; margin: 0; color: #ffffff;">Your Learning Journey Starts Here</p>
            </td>
        </tr>

        <!-- Content Section -->
        <tr>
            <td style="background: #ffffff; padding: 40px 32px; color: #1f2937;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">Hey <strong>{$firstName}</strong>,</p>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">Your EduTrack account is ready! Access your courses, manage assignments, and track your academic progress in one modern platform.</p>

                <!-- Quick Links Card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f9ff 0%, #f0fdff 100%); border: 1px solid #cffafe; border-radius: 10px; margin-bottom: 32px;">
                    <tr>
                        <td style="padding: 24px 20px;">
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">📧 Login Email</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500;">{$email}</div>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">👤 Account Type</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500;">{$roleDisplay}</div>
                            </div>
                            <a href="{$portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 12px;">Get Started Now</a>
                        </td>
                    </tr>
                </table>

                <!-- Features Section -->
                <div style="margin-bottom: 32px;">
                    <div style="font-weight: 700; color: #1f2937; font-size: 16px; margin-bottom: 16px;">What You Can Do:</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 18px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Access all your courses and learning materials</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 18px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Submit assignments and track deadlines</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 18px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Monitor grades and academic progress</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Support Info -->
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #1754cf;">
                    <div style="font-size: 13px; color: #4b5563; line-height: 1.6;"><strong>Need Help?</strong> Contact our support team at <a href="mailto:support@mcc.edu.ph" style="color: #1754cf; text-decoration: none; font-weight: 600;">support@mcc.edu.ph</a></div>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background: #1f2937; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-radius: 0 0 12px 12px;">
                <div style="margin-bottom: 8px; color: #ffffff; font-weight: 600;">EduTrack PH</div>
                <div>© 2025 Mindoro State University</div>
                <div style="margin-top: 8px; font-size: 11px;">Empowering Education Through Technology</div>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

    return $html;
}

/**
 * Generate password reset email HTML template
 *
 * @param string $firstName User's first name
 * @param string $resetUrl URL with reset token
 * @param string $logoUrl URL to the EduTrack logo
 * @return string HTML email template
 */
function generate_password_reset_email($firstName, $resetUrl, $logoUrl = '')
{
    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f9fafb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <!-- Hero Section -->
        <tr>
            <td style="background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); padding: 60px 24px; text-align: center; color: #ffffff; border-radius: 12px 12px 0 0;">
                <div style="font-size: 32px; font-weight: 800; margin-bottom: 24px; letter-spacing: -1px;"></div>
                    <!-- Logo (embedded CID image) -->
                    <img src="cid:edu_logo" alt="EduTrack logo" style="max-width:140px; height:auto; display:block; margin:0 auto 24px auto;" />
                <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; line-height: 1.2;">Reset Password 🔐</h1>
                <p style="font-size: 15px; opacity: 0.95; margin: 0; color: #ffffff;">Secure Your Account</p>
            </td>
        </tr>

        <!-- Content Section -->
        <tr>
            <td style="background: #ffffff; padding: 40px 32px; color: #1f2937;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">Hi <strong>{$firstName}</strong>,</p>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">We received a request to reset your password. Click the button below to create a new one.</p>
                
                <!-- CTA Button -->
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="text-align: center; padding: 24px 0;">
                            <a href="{$resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); color: #ffffff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">Reset Password</a>
                        </td>
                    </tr>
                </table>

                <!-- Security Alert -->
                <div style="background: #fef3c7; border-left: 5px solid #d97706; padding: 16px; border-radius: 8px; margin: 32px 0; font-size: 14px; color: #78350f;">
                    <div style="font-weight: 700; margin-bottom: 8px;">⚠️ Security Notice</div>
                    <div>This link expires in 24 hours. If you didn't request this, ignore this email or contact support immediately.</div>
                </div>

                <!-- Fallback Link -->
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                    <strong>Link not working?</strong> Copy and paste this URL: <br>
                    <span style="word-break: break-all; color: #1754cf;">{$resetUrl}</span>
                </p>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background: #1f2937; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-radius: 0 0 12px 12px;">
                <div style="margin-bottom: 8px; color: #ffffff; font-weight: 600;">EduTrack PH</div>
                <div>© 2025 Mindoro State University</div>
                <div style="margin-top: 8px; font-size: 11px;">Empowering Education Through Technology</div>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

    return $html;
}

/**
 * Generate assignment submission confirmation email
 *
 * @param string $firstName Student's first name
 * @param string $assignmentTitle Assignment name
 * @param string $submissionTime Time of submission
 * @param string $logoUrl URL to the EduTrack logo
 * @return string HTML email template
 */
function generate_assignment_confirmation_email($firstName, $assignmentTitle, $submissionTime, $logoUrl = '')
{
    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f9fafb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <!-- Hero Section -->
        <tr>
            <td style="background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); padding: 60px 24px; text-align: center; color: #ffffff; border-radius: 12px 12px 0 0;">
                <div style="font-size: 32px; font-weight: 800; margin-bottom: 24px; letter-spacing: -1px;"></div>
                    <!-- Logo (embedded CID image) -->
                    <img src="cid:edu_logo" alt="EduTrack logo" style="max-width:140px; height:auto; display:block; margin:0 auto 24px auto;" />
                <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; line-height: 1.2;">✓ Submitted! 🎉</h1>
                <p style="font-size: 15px; opacity: 0.95; margin: 0; color: #ffffff;">Your assignment is on the way</p>
            </td>
        </tr>

        <!-- Content Section -->
        <tr>
            <td style="background: #ffffff; padding: 40px 32px; color: #1f2937;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">Great job, <strong>{$firstName}</strong>! 👏</p>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">Your assignment has been successfully submitted and is now under review by your instructor. You'll receive feedback soon!</p>
                
                <!-- Submission Details Card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdff 0%, #e0f7ff 100%); border: 1px solid #cffafe; border-radius: 10px; margin-bottom: 32px;">
                    <tr>
                        <td style="padding: 24px 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-bottom: 16px;">
                                        <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">📚 Assignment</div>
                                        <div style="color: #1f2937; font-size: 15px; font-weight: 500;">{$assignmentTitle}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">⏱️ Submitted At</div>
                                        <div style="color: #1f2937; font-size: 15px; font-weight: 500;">{$submissionTime}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Next Steps -->
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <div style="font-weight: 700; color: #1f2937; margin-bottom: 12px;">What's Next?</div>
                    <div style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                        ✓ Check your EduTrack dashboard for instructor feedback<br>
                        ✓ Review any comments or suggestions provided<br>
                        ✓ Plan ahead for upcoming assignments
                    </div>
                </div>

                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">Keep pushing forward and don't hesitate to reach out to your instructor if you have questions!</p>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background: #1f2937; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-radius: 0 0 12px 12px;">
                <div style="margin-bottom: 8px; color: #ffffff; font-weight: 600;">EduTrack PH</div>
                <div>© 2025 Mindoro State University</div>
                <div style="margin-top: 8px; font-size: 11px;">Empowering Education Through Technology</div>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

    return $html;
}

/**
 * Generate welcome email with credentials for newly created user
 *
 * @param string $firstName User's first name
 * @param string $email User's email address
 * @param string $role User's role (student, teacher, admin)
 * @param string $password User's password
 * @param string $portalUrl Base URL of the portal
 * @param string $logoUrl URL to the EduTrack logo
 * @return string HTML email template
 */
function generate_welcome_email_with_credentials($firstName, $email, $role, $password, $portalUrl = '', $logoUrl = '')
{
    $roleDisplay = ucfirst($role);
    
    // Set defaults if not provided
    if (empty($portalUrl)) {
        $portalUrl = 'http://localhost:5174/auth';
    }

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f9fafb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <!-- Hero Section with Modern Gradient -->
        <tr>
            <td style="background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); padding: 60px 24px; text-align: center; color: #ffffff; border-radius: 12px 12px 0 0;">
                <!-- Logo (embedded CID image) -->
                <img src="cid:edu_logo" alt="EduTrack logo" style="max-width:140px; height:auto; display:block; margin:0 auto 24px auto;" />
                <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; line-height: 1.2;">Welcome Aboard! 🚀</h1>
                <p style="font-size: 15px; opacity: 0.95; margin: 0; color: #ffffff;">Your Learning Journey Starts Here</p>
            </td>
        </tr>

        <!-- Content Section -->
        <tr>
            <td style="background: #ffffff; padding: 40px 32px; color: #1f2937;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">Hey <strong>{$firstName}</strong>,</p>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">Your EduTrack account is ready! Access your courses, manage assignments, and track your academic progress in one modern platform. Below are your login credentials:</p>

                <!-- Credentials Card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f9ff 0%, #f0fdff 100%); border: 1px solid #cffafe; border-radius: 10px; margin-bottom: 32px;">
                    <tr>
                        <td style="padding: 24px 20px;">
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">📧 Email</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500; word-break: break-all;">{$email}</div>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">🔑 Password</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500; font-family: 'Courier New', monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px;">{$password}</div>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">👤 Role</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500;">{$roleDisplay}</div>
                            </div>
                            <a href="{$portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 16px;">Get Started Now</a>
                        </td>
                    </tr>
                </table>

                <!-- Security Notice -->
                <div style="background: #fef3c7; border-left: 5px solid #d97706; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #78350f;">
                    <div style="font-weight: 700; margin-bottom: 8px;">⚠️ Important Security Notice</div>
                    <div>Please change your password immediately upon first login. Keep your credentials secure and do not share them with anyone.</div>
                </div>

                <!-- What You Can Do -->
                <div style="margin-bottom: 24px;">
                    <div style="font-weight: 700; color: #1f2937; font-size: 16px; margin-bottom: 12px;">What You Can Do:</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 16px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Access all your courses and learning materials</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 16px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Submit assignments and track deadlines</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 16px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Monitor grades and academic progress</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Support Info -->
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #1754cf;">
                    <div style="font-size: 13px; color: #4b5563; line-height: 1.6;"><strong>Need Help?</strong> Contact our support team at <a href="mailto:support@mcc.edu.ph" style="color: #1754cf; text-decoration: none; font-weight: 600;">support@mcc.edu.ph</a></div>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background: #1f2937; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-radius: 0 0 12px 12px;">
                <div style="margin-bottom: 8px; color: #ffffff; font-weight: 600;">EduTrack PH</div>
                <div>© 2025 Mindoro State University</div>
                <div style="margin-top: 8px; font-size: 11px;">Empowering Education Through Technology</div>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

    return $html;
}

/**
 * Generate welcome email with credentials for newly created student
 *
 * @param string $firstName Student's first name
 * @param string $email Student's email address
 * @param string $password Student's password
 * @param string $studentId Student ID number
 * @param string $yearLevel Year level (1st Year, 2nd Year, etc.)
 * @param string $portalUrl Base URL of the portal
 * @param string $logoUrl URL to the EduTrack logo
 * @return string HTML email template
 */
function generate_student_welcome_email_with_credentials($firstName, $email, $password, $studentId = '', $yearLevel = '', $portalUrl = '', $logoUrl = '')
{
    // Set defaults if not provided
    if (empty($portalUrl)) {
        $portalUrl = 'http://localhost:5174/auth';
    }

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f9fafb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <!-- Hero Section with Modern Gradient -->
        <tr>
            <td style="background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); padding: 60px 24px; text-align: center; color: #ffffff; border-radius: 12px 12px 0 0;">
                <!-- Logo (embedded CID image) -->
                <img src="cid:edu_logo" alt="EduTrack logo" style="max-width:140px; height:auto; display:block; margin:0 auto 24px auto;" />
                <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; line-height: 1.2;">Welcome to Your Journey! 🎓</h1>
                <p style="font-size: 15px; opacity: 0.95; margin: 0; color: #ffffff;">Your Student Portal is Ready</p>
            </td>
        </tr>

        <!-- Content Section -->
        <tr>
            <td style="background: #ffffff; padding: 40px 32px; color: #1f2937;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">Hello <strong>{$firstName}</strong>,</p>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">Welcome to EduTrack! Your student account has been successfully created. Below are your login credentials and enrollment information:</p>

                <!-- Credentials Card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f9ff 0%, #f0fdff 100%); border: 1px solid #cffafe; border-radius: 10px; margin-bottom: 32px;">
                    <tr>
                        <td style="padding: 24px 20px;">
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">📧 Email</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500; word-break: break-all;">{$email}</div>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">🔑 Password</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500; font-family: 'Courier New', monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px;">{$password}</div>
                            </div>
HTML;

    if (!empty($studentId)) {
        $html .= <<<HTML
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">🎯 Student ID</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500;">{$studentId}</div>
                            </div>
HTML;
    }

    if (!empty($yearLevel)) {
        $html .= <<<HTML
                            <div style="margin-bottom: 16px;">
                                <div style="font-weight: 700; color: #1754cf; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">📚 Year Level</div>
                                <div style="color: #1f2937; font-size: 15px; font-weight: 500;">{$yearLevel}</div>
                            </div>
HTML;
    }

    $html .= <<<HTML
                            <a href="{$portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #1754cf 0%, #26d9d9 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 16px;">Access Your Portal</a>
                        </td>
                    </tr>
                </table>

                <!-- Security Notice -->
                <div style="background: #fef3c7; border-left: 5px solid #d97706; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #78350f;">
                    <div style="font-weight: 700; margin-bottom: 8px;">⚠️ Important Security Notice</div>
                    <div>Please change your password immediately upon first login. Keep your credentials secure and do not share them with anyone.</div>
                </div>

                <!-- What You Can Do -->
                <div style="margin-bottom: 24px;">
                    <div style="font-weight: 700; color: #1f2937; font-size: 16px; margin-bottom: 12px;">Your Access Includes:</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 16px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Access all assigned courses and learning materials</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 16px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Submit assignments and view submission history</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 16px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Monitor your grades and academic progress</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="color: #26d9d9; font-size: 16px; font-weight: bold;">✓</div>
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">Communicate with instructors and classmates</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Support Info -->
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #1754cf;">
                    <div style="font-size: 13px; color: #4b5563; line-height: 1.6;"><strong>Need Help?</strong> Contact our support team at <a href="mailto:support@mcc.edu.ph" style="color: #1754cf; text-decoration: none; font-weight: 600;">support@mcc.edu.ph</a></div>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background: #1f2937; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-radius: 0 0 12px 12px;">
                <div style="margin-bottom: 8px; color: #ffffff; font-weight: 600;">EduTrack PH</div>
                <div>© 2025 Mindoro State University</div>
                <div style="margin-top: 8px; font-size: 11px;">Empowering Education Through Technology</div>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

    return $html;
}
