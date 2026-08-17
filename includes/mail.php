<?php
declare(strict_types=1);

/**
 * Load SMTP settings from config/mail.local.php.
 *
 * @return array<string, mixed>
 */
function mail_config(): array
{
    static $config = null;
    if (is_array($config)) {
        return $config;
    }

    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'mail.local.php';
    if (!is_file($path)) {
        throw new RuntimeException('Missing config/mail.local.php. Copy config/mail.example.php and add SMTP credentials.');
    }

    $loaded = require $path;
    if (!is_array($loaded)) {
        throw new RuntimeException('Invalid mail configuration.');
    }

    $config = $loaded;
    return $config;
}

/**
 * Send an email through Gmail SMTP (STARTTLS).
 *
 * @param string $to          Recipient address
 * @param string $subject     Message subject
 * @param string $htmlBody    HTML body
 * @param string $replyTo     Optional Reply-To address
 * @param string $replyName   Optional Reply-To name
 * @param string $textBody    Optional plain-text alternative
 */
function send_mail(
    string $to,
    string $subject,
    string $htmlBody,
    string $replyTo = '',
    string $replyName = '',
    string $textBody = ''
): void {
    $config = mail_config();
    $host = (string) ($config['smtp_host'] ?? 'smtp.gmail.com');
    $port = (int) ($config['smtp_port'] ?? 587);
    $user = (string) ($config['smtp_user'] ?? '');
    $pass = (string) ($config['smtp_pass'] ?? '');
    $from = (string) ($config['smtp_from'] ?? $user);
    $fromName = (string) ($config['smtp_from_name'] ?? 'SpectrumX');

    if ($user === '' || $pass === '' || $to === '') {
        throw new RuntimeException('Mail is not configured.');
    }

    $errno = 0;
    $errstr = '';
    $socket = @stream_socket_client(
        'tcp://' . $host . ':' . $port,
        $errno,
        $errstr,
        25,
        STREAM_CLIENT_CONNECT
    );

    if (!is_resource($socket)) {
        throw new RuntimeException('Could not connect to mail server.');
    }

    stream_set_timeout($socket, 25);

    try {
        smtp_expect($socket, [220]);
        smtp_command($socket, 'EHLO spectrumx.ltd', [250]);
        smtp_command($socket, 'STARTTLS', [220]);

        $crypto = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if ($crypto !== true) {
            throw new RuntimeException('Could not start a secure mail connection.');
        }

        smtp_command($socket, 'EHLO spectrumx.ltd', [250]);
        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode($user), [334]);
        smtp_command($socket, base64_encode($pass), [235]);
        smtp_command($socket, 'MAIL FROM:<' . smtp_addr($from) . '>', [250]);
        smtp_command($socket, 'RCPT TO:<' . smtp_addr($to) . '>', [250, 251]);
        smtp_command($socket, 'DATA', [354]);

        $payload = smtp_build_message($from, $fromName, $to, $subject, $htmlBody, $replyTo, $replyName, $textBody);
        fwrite($socket, $payload . "\r\n.\r\n");
        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221, 250]);
    } finally {
        fclose($socket);
    }
}

/**
 * Send a consultation/contact enquiry to the configured inbox.
 *
 * @param array<string, string> $fields
 */
function send_contact_email(array $fields): void
{
    $config = mail_config();
    $to = (string) ($config['mail_to'] ?? '');
    if ($to === '') {
        throw new RuntimeException('No recipient is configured.');
    }

    $first = $fields['first_name'] ?? '';
    $last = $fields['last_name'] ?? '';
    $name = trim($first . ' ' . $last);
    $email = $fields['email'] ?? '';
    $company = $fields['company'] ?? '';
    $phone = $fields['phone'] ?? '';
    $service = $fields['service'] ?? '';
    $message = $fields['message'] ?? '';

    $subject = 'New consultation request' . ($name !== '' ? ' from ' . $name : '');

    $rows = [
        'Name' => $name,
        'Email' => $email,
        'Phone' => $phone,
        'Company' => $company,
        'Service' => $service,
        'Message' => $message,
    ];

    $html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">';
    $html .= '<p>A new consultation request was submitted on spectrumx.ltd.</p>';
    $html .= '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px">';
    foreach ($rows as $label => $value) {
        $html .= '<tr>';
        $html .= '<td style="border:1px solid #ddd;font-weight:bold;width:140px;vertical-align:top">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</td>';
        $html .= '<td style="border:1px solid #ddd;white-space:pre-wrap">' . nl2br(htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8')) . '</td>';
        $html .= '</tr>';
    }
    $html .= '</table></div>';

    $text = "New consultation request from spectrumx.ltd\n\n";
    foreach ($rows as $label => $value) {
        $text .= $label . ': ' . $value . "\n";
    }

    send_mail($to, $subject, $html, $email, $name, $text);
}

/**
 * @param resource $socket
 * @param int[]    $ok
 */
function smtp_command($socket, string $command, array $ok): string
{
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $ok);
}

/**
 * @param resource $socket
 * @param int[]    $ok
 */
function smtp_expect($socket, array $ok): string
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $ok, true)) {
        throw new RuntimeException('Mail server rejected the message.');
    }

    return $response;
}

function smtp_addr(string $email): string
{
    $email = trim($email);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Invalid email address.');
    }
    return $email;
}

function smtp_header_value(string $value): string
{
    $value = str_replace(["\r", "\n"], '', $value);
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function smtp_build_message(
    string $from,
    string $fromName,
    string $to,
    string $subject,
    string $htmlBody,
    string $replyTo,
    string $replyName,
    string $textBody
): string {
    $boundary = 'b' . bin2hex(random_bytes(12));
    $date = date('r');
    $textBody = $textBody !== '' ? $textBody : trim(html_entity_decode(strip_tags($htmlBody), ENT_QUOTES, 'UTF-8'));

    $headers = [
        'Date: ' . $date,
        'From: ' . smtp_header_value($fromName) . ' <' . smtp_addr($from) . '>',
        'To: <' . smtp_addr($to) . '>',
        'Subject: ' . smtp_header_value($subject),
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ];

    if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $reply = $replyName !== ''
            ? smtp_header_value($replyName) . ' <' . $replyTo . '>'
            : '<' . $replyTo . '>';
        $headers[] = 'Reply-To: ' . $reply;
    }

    $body  = '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($textBody));
    $body .= '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($htmlBody));
    $body .= '--' . $boundary . "--\r\n";

    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;
    return preg_replace('/^\./m', '..', $message) ?? $message;
}
