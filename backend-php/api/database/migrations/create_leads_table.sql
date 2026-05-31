-- ============================================================
-- Tabla de leads: personas registradas desde el modal de bienvenida
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    fuente VARCHAR(50) DEFAULT 'modal_bienvenida',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha_lead (created_at),
    INDEX idx_fuente (fuente)
);
