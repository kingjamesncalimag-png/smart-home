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
    $host = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
    $user = getenv('SMTP_USER') ?: '';
    $pass = getenv('SMTP_PASS') ?: '';
    $port = (int)(getenv('SMTP_PORT') ?: 465);
    $from = getenv('SMTP_FROM') ?: $user;

    $socket = fsockopen($host, $port, $errno, $errstr, 10);
    if (!$socket) throw new RuntimeException("SMTP connect failed: $errstr");

    $read = function() use ($socket) {
        $r = '';
        while ($line = fgets($socket, 515)) {
            $r .= $line;
            if ($line[3] === ' ') break;
        }
        return $r;
    };

    $send = function(string $cmd) use ($socket, $read) {
        fwrite($socket, $cmd . "\r\n");
        return $read();
    };

    $read();
    $send("EHLO " . gethostname());
    $send("STARTTLS");
    stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    $send("EHLO " . gethostname());
    $send("AUTH LOGIN");
    $send(base64_encode($user));
    $send(base64_encode($pass));
    $send("MAIL FROM:<$from>");
    $send("RCPT TO:<$to>");
    $send("DATA");

    $body = "Subject: Smart Home Login Code\r\n"
          . "From: Smart Home <$from>\r\n"
          . "To: $to\r\n"
          . "Content-Type: text/html\r\n"
          . "\r\n"
          . "<h2>Your login code is: <b>$otp</b></h2>"
          . "<p>Expires in 10 minutes. Do not share it.</p>";

    fwrite($socket, $body . "\r\n.\r\n");
    $read();
    $send("QUIT");
    fclose($socket);
}
