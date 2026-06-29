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

// ─── existing code above ───

function sendJson($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// ─── ADD BELOW ───

define('SESSION_TIMEOUT', 1800); // 30 minutes

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
