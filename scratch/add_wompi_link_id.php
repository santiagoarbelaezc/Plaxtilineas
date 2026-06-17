<?php
require_once __DIR__ . '/../backend-php/api/config/database.php';

try {
    $db = Database::getConnection();
    
    // Verificar si la columna ya existe
    $stmt = $db->query("SHOW COLUMNS FROM pedidos LIKE 'wompi_link_id'");
    $exists = $stmt->fetch();
    
    if (!$exists) {
        $db->exec("ALTER TABLE pedidos ADD COLUMN wompi_link_id VARCHAR(120) NULL AFTER wompi_transaction_id");
        $db->exec("ALTER TABLE pedidos ADD INDEX idx_wompi_link_id (wompi_link_id)");
        echo "Columna wompi_link_id agregada con éxito.\n";
    } else {
        echo "La columna wompi_link_id ya existe.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
