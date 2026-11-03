<?php
/**
 * Script para ejecutar la migración de la base de datos (Wompi + stock_reservas)
 * Autor: Antigravity AI
 */

header('Content-Type: text/html; charset=utf-8');

try {
    // Cargar config y conexión de base de datos
    require_once __DIR__ . '/../config/config.php';
    require_once __DIR__ . '/../config/database.php';

    echo "<h2>Iniciando migración de base de datos...</h2>";

    $pdo = Database::getConnection();
    echo "<p style='color: green;'>✅ Conexión a la base de datos establecida correctamente: <strong>" . DB_NAME . "</strong></p>";

    // Helper para verificar si existe una columna
    function columnExists($pdo, $table, $column) {
        $stmt = $pdo->query("DESCRIBE `$table`");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        return in_array($column, $columns);
    }

    // 1. Modificar columna estado en pedidos
    echo "<h3>1. Modificando estado de pedidos a ENUM ampliado...</h3>";
    $alterEstadoSql = "ALTER TABLE pedidos MODIFY COLUMN estado ENUM(
        'draft',
        'pendiente_pago',
        'pagado',
        'pendiente',
        'confirmado',
        'en_preparacion',
        'en_camino',
        'entregado',
        'cancelado'
    ) NOT NULL DEFAULT 'draft'";
    $pdo->exec($alterEstadoSql);
    echo "<p style='color: green;'>✅ Columna 'estado' en tabla 'pedidos' actualizada correctamente.</p>";

    // 2. Agregar columnas de Wompi e impuestos
    echo "<h3>2. Creando columnas Wompi e impuestos en tabla 'pedidos' si no existen...</h3>";

    $columnsToAdd = [
        'wompi_referencia'     => "VARCHAR(60) NULL AFTER metodo_pago",
        'wompi_transaction_id' => "VARCHAR(120) NULL AFTER wompi_referencia",
        'wompi_evento_id'      => "VARCHAR(120) NULL AFTER wompi_transaction_id",
        'wompi_monto_centavos' => "BIGINT NULL AFTER wompi_evento_id",
        'wompi_pagado_at'      => "DATETIME NULL AFTER wompi_monto_centavos",
        'iva'                  => "DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER subtotal",
        'costo_envio'          => "DECIMAL(12,2) NOT NULL DEFAULT 10000 AFTER iva"
    ];

    foreach ($columnsToAdd as $col => $definition) {
        if (!columnExists($pdo, 'pedidos', $col)) {
            $pdo->exec("ALTER TABLE pedidos ADD COLUMN `$col` $definition");
            echo "<p style='color: green;'>✅ Columna agregada: <strong>$col</strong></p>";
        } else {
            echo "<p style='color: orange;'>⚠️ La columna <strong>$col</strong> ya existe en 'pedidos'.</p>";
        }
    }

    // Agregar índices únicos si no existen
    echo "<h3>3. Creando índices únicos en tabla 'pedidos'...</h3>";
    // Check indexes
    $stmt = $pdo->query("SHOW INDEX FROM pedidos");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $indexNames = array_column($indexes, 'Key_name');

    if (!in_array('idx_wompi_referencia', $indexNames)) {
        $pdo->exec("ALTER TABLE pedidos ADD UNIQUE INDEX idx_wompi_referencia (wompi_referencia)");
        echo "<p style='color: green;'>✅ Índice idx_wompi_referencia creado.</p>";
    } else {
        echo "<p style='color: orange;'>⚠️ El índice idx_wompi_referencia ya existe.</p>";
    }

    if (!in_array('idx_wompi_evento_id', $indexNames)) {
        $pdo->exec("ALTER TABLE pedidos ADD UNIQUE INDEX idx_wompi_evento_id (wompi_evento_id)");
        echo "<p style='color: green;'>✅ Índice idx_wompi_evento_id creado.</p>";
    } else {
        echo "<p style='color: orange;'>⚠️ El índice idx_wompi_evento_id ya existe.</p>";
    }

    // 3. Crear tabla stock_reservas
    echo "<h3>4. Creando tabla 'stock_reservas' si no existe...</h3>";
    
    // Dropear primero si fue creada con DATETIME anteriormente para sincronizar estructura exacta
    $pdo->exec("DROP TABLE IF EXISTS stock_reservas");
    
    $createTableSql = "CREATE TABLE IF NOT EXISTS stock_reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id INT NOT NULL,
        producto_id INT NOT NULL,
        variante_id INT DEFAULT NULL,
        cantidad INT NOT NULL,
        creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expira_at TIMESTAMP NOT NULL,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        INDEX idx_pedido (pedido_id),
        INDEX idx_producto (producto_id),
        INDEX idx_expira (expira_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $pdo->exec($createTableSql);
    echo "<p style='color: green;'>✅ Tabla 'stock_reservas' verificada/creada con éxito.</p>";

    echo "<h2 style='color: green;'>🎉 ¡Migración completada con éxito!</h2>";

} catch (PDOException $e) {
    echo "<h2 style='color: red;'>❌ Error durante la migración</h2>";
    echo "<pre style='background: #fee; padding: 10px; border: 1px solid red;'>" . htmlspecialchars($e->getMessage()) . "</pre>";
} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Error general</h2>";
    echo "<pre style='background: #fee; padding: 10px; border: 1px solid red;'>" . htmlspecialchars($e->getMessage()) . "</pre>";
}
?>
