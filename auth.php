<?php
/**
 * api/auth.php
 *
 * POST { "username": "...", "password": "..." }
 * -> { "success": true, "username": "...", "role": "admin"|"client" }
 * -> { "success": false, "message": "..." }
 *
 * Reads from the `users` table (which includes all created accounts).
 * The role field in the request body is IGNORED — role comes from the DB.
 */
require_once __DIR__ . '/config.php';
session_start();
jsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(['success' => false, 'message' => 'Use POST'], 405);
}

$input    = jsonInput();
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (!$username || !$password) {
    sendJson(['success' => false, 'message' => 'Username and password are required'], 400);
}

$db   = getDb();
$stmt = $db->prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    sendJson(['success' => false, 'message' => 'Invalid username or password'], 401);
}

// Store in session so PHP endpoints know who's calling
$_SESSION['user_id']  = $user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['role']     = $user['role'];

session_regenerate_id(true); // prevents session fixation attacks

sendJson([
    'success'  => true,
    'id'       => $user['id'],
    'username' => $user['username'],
    'role'     => $user['role'],   // frontend uses this to set up role-based UI
]);
