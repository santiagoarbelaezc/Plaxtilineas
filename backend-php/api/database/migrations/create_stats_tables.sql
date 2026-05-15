-- Seguimiento de visitas generales (Tráfico diario)
CREATE TABLE IF NOT EXISTS estadisticas_visitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45),
    user_agent TEXT,
    pagina_url VARCHAR(255),
    session_id VARCHAR(100),
    fecha DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha (fecha)
);

-- Seguimiento de vista de productos (Productos más populares)
CREATE TABLE IF NOT EXISTS estadisticas_productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    session_id VARCHAR(100),
    fecha DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    INDEX idx_producto_fecha (producto_id, fecha)
);
