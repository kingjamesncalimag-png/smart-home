<?php
/**
 * config.php — shared database connection + settings.
 */

// ── Database ──────────────────────────────────────────────
define('DB_HOST', 'sql209.infinityfree.com');
define('DB_NAME', 'if0_42289937_smart_home');
define('DB_USER', 'if0_42289937');
define('DB_PASS', 'DiXick4Moemiah');

// ── Serial port (used only by Node.js bridge — not used here) ──
define('SERIAL_PORT', 'COM6');
define('SERIAL_BAUD', 9600);

function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
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