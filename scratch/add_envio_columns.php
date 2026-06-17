<?php
require_once __DIR__ . '/../backend-php/api/config/database.php';

try {
    $db = Database::getConnection();
    
    // Check if columns already exist
    $columns = $db->query("DESCRIBE pedidos")->fetchAll(PDO::FETCH_COLUMN);
    
    $toAdd = [];
    if (!in_array('guia_numero', $columns)) {
        $toAdd[] = "ADD COLUMN guia_numero VARCHAR(100) DEFAULT NULL";
    }
    if (!in_array('transportadora', $columns)) {
        $toAdd[] = "ADD COLUMN transportadora VARCHAR(120) DEFAULT NULL";
    }
    if (!in_array('fecha_envio', $columns)) {
        $toAdd[] = "ADD COLUMN fecha_envio DATETIME DEFAULT NULL";
    }
    
    if (!empty($toAdd)) {
        $sql = "ALTER TABLE pedidos " . implode(', ', $toAdd);
        $db->exec($sql);
        echo "Successfully added columns: " . implode(', ', array_map(fn($c) => explode(' ', trim($c))[2], $toAdd)) . "\n";
    } else {
        echo "All logistics columns already exist in the database.\n";
    }
} catch (Exception $e) {
    echo "ERROR migrating database: " . $e->getMessage() . "\n";
    exit(1);
}
