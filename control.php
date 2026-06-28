<?php
/**
 * api/control.php
 * POST { "type": "door"|"clothes"|"led_red"|"led_white", "action": "open"|"close"|"on"|"off"|"auto" }
 * Queues a command row; bridge.php picks it up and sends it to the Arduino.
 */
require_once __DIR__ . '/config.php';
jsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(['success' => false, 'message' => 'Use POST'], 405);
}

$input = jsonInput();
$type = $input['type'] ?? '';
$action = strtoupper($input['action'] ?? '');

$map = [
    'door'      => ['OPEN' => 'DOOR:OPEN',          'CLOSE' => 'DOOR:CLOSE'],
'clothes' => [
    'OPEN'    => 'CLOTHES:OPEN',
    'OUTSIDE' => 'CLOTHES:OPEN',

    'CLOSE'   => 'CLOTHES:CLOSE',
    'INSIDE'  => 'CLOTHES:CLOSE',

    'AUTO'    => 'CLOTHES:AUTO'
],
    'led_red'   => ['ON'   => 'LED:RED:ON',         'OFF'   => 'LED:RED:OFF'],
    'led_white' => ['ON'   => 'LED:WHITE:ON',       'OFF'   => 'LED:WHITE:OFF'],
];

$command = $map[$type][$action] ?? null;
if (!$command) {
    sendJson(['success' => false, 'message' => 'Unknown type/action combination'], 400);
}

$db = getDb();
$stmt = $db->prepare("INSERT INTO device_commands (command, status) VALUES (?, 'pending')");
$stmt->execute([$command]);

sendJson(['success' => true, 'queued' => $command]);
