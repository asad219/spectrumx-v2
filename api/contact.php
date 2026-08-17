<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once dirname(__DIR__) . '/includes/mail.php';

function contact_field(string $key, int $max = 2000): string
{
    $value = $_POST[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

function contact_error(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$first = contact_field('first_name', 80);
$last = contact_field('last_name', 80);
$email = contact_field('email', 180);
$company = contact_field('company', 160);
$phone = contact_field('phone', 40);
$service = contact_field('service', 80);
$message = contact_field('message', 4000);
$token = contact_field('g-recaptcha-response', 4000);

if ($first === '' || $last === '' || $email === '' || $service === '') {
    contact_error(422, 'Please fill in the required fields.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    contact_error(422, 'Please enter a valid email address.');
}

try {
    $config = mail_config();
} catch (Throwable $e) {
    contact_error(500, 'Mail is not configured on the server.');
}

$secret = (string) ($config['recaptcha_secret'] ?? '');
if ($secret !== '') {
    if ($token === '') {
        contact_error(422, 'Please complete the verification and try again.');
    }

    $verify = null;
    if (function_exists('curl_init')) {
        $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
        ]);
        $verify = curl_exec($ch);
        curl_close($ch);
    } else {
        $verify = @file_get_contents(
            'https://www.google.com/recaptcha/api/siteverify',
            false,
            stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                    'content' => http_build_query([
                        'secret' => $secret,
                        'response' => $token,
                        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
                    ]),
                    'timeout' => 12,
                ],
            ])
        );
    }

    $result = is_string($verify) ? json_decode($verify, true) : null;
    if (!is_array($result) || empty($result['success'])) {
        contact_error(422, 'Verification failed. Please try again.');
    }
}

try {
    send_contact_email([
        'first_name' => $first,
        'last_name' => $last,
        'email' => $email,
        'company' => $company,
        'phone' => $phone,
        'service' => $service,
        'message' => $message,
    ]);
} catch (Throwable $e) {
    error_log('Contact form mail error: ' . $e->getMessage());
    contact_error(500, 'The message could not be sent. Please email info@spectrumx.ltd.');
}

echo json_encode([
    'ok' => true,
    'message' => 'Thanks — we received your request and will reply within one business day.',
], JSON_UNESCAPED_UNICODE);
