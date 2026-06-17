-- ═══════════════════════════════════════════════════════════════════════════
-- PLAXTILINEAS – Migración: Tabla de Reservas de Stock
-- Fecha: 2026-06-17
-- Descripción: Crea la tabla para la reserva temporal de stock durante el pago con Wompi.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabla de reservas temporales de stock ──────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_reservas (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
