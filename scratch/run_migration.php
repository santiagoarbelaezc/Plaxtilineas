<?php
require_once __DIR__ . '/../backend-php/api/config/database.php';
try {
    $db = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/../backend-php/api/database/migrations/create_configuraciones_table.sql');
    $db->exec($sql);
    echo "Migration executed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
