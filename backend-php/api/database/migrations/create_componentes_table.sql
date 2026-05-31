-- Migración: Crear tabla de componentes dinámicos
CREATE TABLE IF NOT EXISTS componentes_dinamicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('banner', 'anuncio', 'texto') NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    contenido JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orden (orden),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
