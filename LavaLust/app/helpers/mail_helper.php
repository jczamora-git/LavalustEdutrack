<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');


/**
 * Helper: mail_helper.php
 *
 * Improved: attempt to require Composer autoload if present and provide
 * a helpful error message when PHPMailer classes are not available.
 */


use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

function sendNotif($recipient, $subject, $body, $attachmentPath = null)
{
    // If PHPMailer is not available, return a helpful failure message
    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        return [
            'success' => false,
            'message' => 'PHPMailer not found. Please run `composer install` in the project root to install dependencies.'
        ];
    }

    $mail = new PHPMailer(true);

    try {
        //Server settings
        $mail->SMTPDebug = 0;                                       //Disable debug output for production
        $mail->isSMTP();                                            //Send using SMTP
        $mail->Host       = 'smtp.gmail.com';                       //Set the SMTP server to send through
        $mail->SMTPAuth   = true;                                   //Enable SMTP authentication
        $mail->Username   = 'jeizi.zamora@gmail.com';               //SMTP username
        $mail->Password   = 'mhla alsu shwd lfme';                  //SMTP password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;            //Enable implicit TLS encryption
        $mail->Port       = 465;                                    //TCP port to connect to

        //Recipients
        $mail->setFrom('edutrack@mcc.edu.ph', 'EduTrack Notification'); //Set sender
        $mail->addAddress($recipient);                              //Add dynamic recipient

        // Attempt to embed project logo as inline image (CID) so templates can use <img src="cid:edu_logo">
        $projectRoot = dirname(__DIR__, 2); // LavaLust root
        $logoPath = $projectRoot . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'logo.png';
        if (file_exists($logoPath)) {
            try {
                $mail->addEmbeddedImage($logoPath, 'edu_logo', 'logo.png');
            } catch (Exception $e) {
                // If embedding fails, continue without blocking email send
            }
        }

        //Attachments
        if($attachmentPath !== null && file_exists($attachmentPath)) {
            $mail->addAttachment($attachmentPath);                  //Add attachment
        }

        //Content
        $mail->isHTML(true);                                        //Set email format to HTML
        $mail->Subject = $subject;                                  //Dynamic subject
        $mail->Body    = $body;                                     //Dynamic body
        $mail->AltBody = strip_tags($body);                         //Plain text version

        $mail->send();
        
        // Delete attachment after sending if it exists
        if($attachmentPath !== null && file_exists($attachmentPath)) {
            unlink($attachmentPath);
        }
        
        return [
            'success' => true,
            'message' => 'Email has been sent successfully to ' . $recipient . ($attachmentPath ? ' with attachment' : '')
        ];
    } catch (Exception $e) {
        // Include both PHPMailer ErrorInfo and exception message for better debugging
        $errMsg = '';
        if (isset($mail) && isset($mail->ErrorInfo) && $mail->ErrorInfo) {
            $errMsg .= $mail->ErrorInfo . ' '; 
        }
        $errMsg .= $e->getMessage();

        return [
            'success' => false,
            'message' => 'Email could not be sent. Error: ' . trim($errMsg)
        ];
    }
}

