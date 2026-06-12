<?php
require_once __DIR__ . '/../backend-php/api/config/config.php';
require_once __DIR__ . '/../backend-php/api/config/database.php';

try {
    $db = Database::getConnection();
    
    // Read the SQL file
    $sqlFilePath = __DIR__ . '/../backend-php/api/database/migrations/create_pedidos_tables.sql';
    if (!file_exists($sqlFilePath)) {
        die("SQL file not found at $sqlFilePath\n");
    }
    
    $sql = file_get_contents($sqlFilePath);
    
    // Split into individual statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) { return !empty($stmt); }
    );
    
    echo "Running migrations...\n";
    foreach ($statements as $statement) {
        if (!empty(trim($statement))) {
            echo "Executing: " . substr(trim($statement), 0, 50) . "...\n";
            $db->exec($statement);
        }
    }
    
    echo "Migration completed successfully!\n";
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
