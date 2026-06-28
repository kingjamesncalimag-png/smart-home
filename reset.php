<?php
require_once 'config.php';
$db = getDb();
$hash = password_hash('admin123', PASSWORD_BCRYPT);
$db->prepare("UPDATE users SET password_hash=? WHERE username='admin'")->execute([$hash]);
echo "Done! Password is now: admin123 — delete this file now!";
