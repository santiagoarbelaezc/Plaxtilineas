<?php
require_once __DIR__ . '/config/database.php';

try {
    $db = Database::getConnection();
    
    // Add columns to `productos`
    $queries = [
        "ALTER TABLE productos ADD COLUMN stock INT DEFAULT 0 AFTER cantidad",
        "ALTER TABLE productos ADD COLUMN stock_minimo INT DEFAULT 0 AFTER stock",
        "ALTER TABLE productos ADD COLUMN controlar_stock TINYINT(1) DEFAULT 1 AFTER stock_minimo",
        "ALTER TABLE productos ADD COLUMN sku VARCHAR(100) NULL UNIQUE AFTER id",
        "ALTER TABLE productos ADD COLUMN vistas INT DEFAULT 0 AFTER controlar_stock"
    ];

    foreach ($queries as $query) {
        try {
            $db->exec($query);
            echo "Ejecutado: $query\n";
        } catch (PDOException $e) {
            echo "Ignorado (probablemente ya existe): $query\n";
        }
    }

    // Set imported products stock to 20
    $db->exec("UPDATE productos SET stock = 20 WHERE id_hostinger IS NOT NULL AND stock = 0");
    echo "Actualizado stock de productos importados a 20.\n";

    echo "\nMigración completada con éxito.\n";

} catch (Exception $e) {
    echo "Error crítico en migración: " . $e->getMessage() . "\n";
}
