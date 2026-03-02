<?php
require_once __DIR__ . '/api/config/config.php';
require_once __DIR__ . '/api/config/database.php';

header('Content-Type: application/json');

echo json_encode([
    'APP_ENV' => APP_ENV,
    'DB_HOST' => DB_HOST,
    'DB_NAME' => DB_NAME,
    'DB_USER' => DB_USER,
    'testing_connection' => true
]);

try {
    $db = Database::getConnection();
    echo "\nConnection successful!\n";
} catch (Exception $e) {
    echo "\nConnection failed: " . $e->getMessage() . "\n";
}
