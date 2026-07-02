<?php
require_once __DIR__ . '/config.php';

session_start();
requireAuth();
jsonHeaders();

$db   = getDb();
$type = $_GET['type'] ?? 'latest';

if ($type === 'history') {

    $limit = max(1, min(200, (int)($_GET['limit'] ?? 20)));

    $stmt = $db->prepare("
        SELECT temperature, humidity, rain, created_at
        FROM sensor_readings
        ORDER BY id DESC
        LIMIT :limit
    ");

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();

    // Convert timestamps to ISO 8601 UTC
    foreach ($rows as &$row) {
        if (!empty($row['created_at'])) {
            $row['created_at'] = gmdate(
                'c',
                strtotime($row['created_at'] . ' UTC')
            );
        }
    }
    unset($row);

    sendJson($rows);
}

// Default: latest device status
$status = $db->query("SELECT * FROM device_status WHERE id = 1")->fetch();

if ($status) {

    $lastSeen = !empty($status['last_seen'])
        ? strtotime($status['last_seen'] . ' UTC')
        : 0;

    $status['connection'] =
        (!$lastSeen || time() - $lastSeen > 10)
        ? 'OFFLINE'
        : 'ONLINE';

    if (!empty($status['last_seen'])) {
        $status['last_seen'] = gmdate('c', $lastSeen);
    }

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
