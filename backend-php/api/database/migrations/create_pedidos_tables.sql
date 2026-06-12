-- ═══════════════════════════════════════════════════════════════════════════
-- PLAXTILINEAS – Migración: Sistema de Pedidos
-- Fecha: 2026-06-12
-- Descripción: Crea las tablas para gestión de pedidos y sus detalles.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabla principal de pedidos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_pedido VARCHAR(20) UNIQUE NOT NULL COMMENT 'Código legible ej. PX-2026-0001',
    usuario_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado ENUM('pendiente','confirmado','en_preparacion','en_camino','entregado','cancelado') DEFAULT 'pendiente',
    direccion_envio TEXT NOT NULL,
    ciudad VARCHAR(100) DEFAULT NULL,
    departamento VARCHAR(100) DEFAULT NULL,
    telefono_contacto VARCHAR(20) DEFAULT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'contraentrega',
    notas TEXT DEFAULT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabla de detalles (productos por pedido) ─────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_detalles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    variante_id INT DEFAULT NULL,
    nombre_producto VARCHAR(255) NOT NULL COMMENT 'Snapshot del nombre al momento de la compra',
    imagen_url VARCHAR(500) DEFAULT NULL COMMENT 'Snapshot de la imagen al momento de la compra',
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    INDEX idx_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
