<?php
/**
 * Copy this file to mail.local.php and fill in SMTP credentials.
 * mail.local.php is gitignored and must not be committed.
 */
return [
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_encryption' => 'tls',
    'smtp_user' => 'your-gmail@gmail.com',
    'smtp_pass' => 'your-16-char-app-password',
    'smtp_from' => 'your-gmail@gmail.com',
    'smtp_from_name' => 'SpectrumX Website',
    'mail_to' => 'you@example.com',
    'recaptcha_secret' => '',
];
