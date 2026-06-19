CREATE TABLE IF NOT EXISTS configuraciones (
    clave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO configuraciones (clave, valor) VALUES ('wompi_enabled', '1');
