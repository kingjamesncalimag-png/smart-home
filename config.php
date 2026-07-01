<?php
define('DB_HOST',     getenv('MYSQLHOST')     ?: 'localhost');
define('DB_NAME',     getenv('MYSQLDATABASE') ?: 'railway');
define('DB_USER',     getenv('MYSQLUSER')     ?: 'root');
define('DB_PASS',     getenv('MYSQLPASSWORD') ?: '');
define('DB_PORT',     getenv('MYSQLPORT')     ?: '3306');

function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
    return $pdo;
}

function jsonHeaders(): void {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function jsonInput(): array {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function sendJson($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

define('SESSION_TIMEOUT', 1800);

function requireAuth(): void {
    if (empty($_SESSION['user_id'])) {
        sendJson(['success' => false, 'message' => 'Not authenticated'], 401);
    }
    if (isset($_SESSION['last_active']) &&
        (time() - $_SESSION['last_active']) > SESSION_TIMEOUT) {
        session_destroy();
        sendJson(['success' => false, 'message' => 'Session expired. Please log in again.'], 401);
    }
    $_SESSION['last_active'] = time();
}

function sendOTPEmail(string $to, string $otp): void {
    $apiKey = getenv('BREVO_API_KEY') ?: '';
    $from   = getenv('SMTP_FROM') ?: getenv('SMTP_USER') ?: '';

    $payload = json_encode([
        'sender'      => ['name' => 'Smart Home', 'email' => $from],
        'to'          => [['email' => $to]],
        'subject'     => 'Smart Home Login Code',
        'htmlContent' => "<h2>Your login code is: <b>$otp</b></h2><p>Expires in 10 minutes. Do not share it.</p>"
    ]);

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'api-key: ' . $apiKey
        ]
    ]);
    $result = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 201) {
        throw new RuntimeException("Brevo API error ($status): $result");
    }
}
