<?php
require_once __DIR__ . '/../config.php';
jsonHeaders();

$db   = getDb();
$type = $_GET['type'] ?? 'latest';

if ($type === 'history') {

    $limit = max(1, min(200, (int)($_GET['limit'] ?? 20)));

    // PDO requires bindValue with explicit INT type for LIMIT to work
    $stmt = $db->prepare("
        SELECT temperature, humidity, rain, created_at
        FROM sensor_readings
        ORDER BY id DESC
        LIMIT :limit
    ");

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    sendJson($stmt->fetchAll());
}

// default: latest combined status
$status = $db->query("SELECT * FROM device_status WHERE id = 1")->fetch();

if ($status) {

    $lastSeen = $status['last_seen'] ? strtotime($status['last_seen']) : 0;

    $status['connection'] =
        (!$lastSeen || time() - $lastSeen > 10)
        ? 'OFFLINE'
        : 'ONLINE';

    if ($type === 'latest') {

        $rfid = $db->query("
            SELECT uid, status
            FROM rfid_logs
            ORDER BY id DESC
            LIMIT 1
        ")->fetch();

        if ($rfid) {
            $status['rfid_uid']    = $rfid['uid'];
            $status['rfid_status'] = $rfid['status'];
        }
    }
}

sendJson($status ?: []);