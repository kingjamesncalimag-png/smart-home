<?php
require_once __DIR__ . '/config.php';
session_start();
jsonHeaders();

$action = $_GET['action'] ?? 'login';

if ($action === 'login' || $action === 'send_otp') {

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
    $stmt = $db->prepare('SELECT id, username, password_hash, role, email FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendJson(['success' => false, 'message' => 'Invalid username or password'], 401);
    }

    if (empty($user['email'])) {
        sendJson(['success' => false, 'message' => 'No email on file for this account. Contact admin.'], 400);
    }

    $otp     = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    $db->prepare('UPDATE otp_tokens SET used=1 WHERE user_id=? AND used=0')->execute([$user['id']]);
    $db->prepare('INSERT INTO otp_tokens (user_id, otp_code, expires_at) VALUES (?,?,?)')
       ->execute([$user['id'], $otp, $expires]);

    try {
        sendOTPEmail($user['email'], $otp);
    } catch (Exception $e) {
        sendJson(['success' => false, 'message' => 'Failed to send OTP email: ' . $e->getMessage()], 500);
    }

    $email  = $user['email'];
    $masked = substr($email, 0, 3) . '***' . strstr($email, '@');

    sendJson([
        'success'      => true,
        'user_id'      => $user['id'],
        'masked_email' => $masked
    ]);
}

if ($action === 'verify_otp') {

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJson(['success' => false, 'message' => 'Use POST'], 405);
    }

    $input    = jsonInput();
    $user_id  = (int)($input['user_id'] ?? 0);
    $otp_code = trim($input['otp_code'] ?? '');

    if (!$user_id || !$otp_code) {
        sendJson(['success' => false, 'message' => 'Missing data'], 400);
    }

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT id FROM otp_tokens
         WHERE user_id=? AND otp_code=? AND used=0 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([$user_id, $otp_code]);
    $token = $stmt->fetch();

    if (!$token) {
        sendJson(['success' => false, 'message' => 'Invalid or expired code.'], 401);
    }

    $db->prepare('UPDATE otp_tokens SET used=1 WHERE id=?')->execute([$token['id']]);

    $stmt = $db->prepare('SELECT id, username, role FROM users WHERE id=?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    $_SESSION['user_id']  = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role']     = $user['role'];

    session_regenerate_id(true);

    sendJson([
        'success'  => true,
        'id'       => $user['id'],
        'username' => $user['username'],
        'role'     => $user['role'],
    ]);
}

sendJson(['success' => false, 'message' => 'Unknown action'], 400);
