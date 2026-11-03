-- ═════════════════════════════════════════════════════════════════════════════
-- PLAXTILINEAS – ESQUEMA COMPLETO DE BASE DE DATOS
-- Versión: 2.0 (Producción Unificada)
-- Descripción: Archivo único con todas las tablas, índices, llaves foráneas y 
--              campos para Wompi, CAPTCHA, carritos y autenticación.
-- ═════════════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA DE CAPTCHAS VECTORIALES SVG
CREATE TABLE IF NOT EXISTS `captchas` (
  `id` VARCHAR(64) PRIMARY KEY,
  `codigo` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA DE CARRITOS
CREATE TABLE IF NOT EXISTS `carritos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `variante_id` INT DEFAULT NULL,
  `cantidad` INT NOT NULL DEFAULT 1,
  `precio_unitario` DECIMAL(12,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_usuario_producto_variante` (`usuario_id`, `producto_id`, `variante_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA DE HISTORIAL DE CHAT
CREATE TABLE IF NOT EXISTS `chat_historial` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` VARCHAR(100) NOT NULL,
  `rol` ENUM('user', 'assistant') NOT NULL,
  `mensaje` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_session` (`session_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA DE COMPONENTES CMS
CREATE TABLE IF NOT EXISTS `componentes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clave` VARCHAR(100) NOT NULL UNIQUE,
  `titulo` VARCHAR(255) NOT NULL,
  `contenido` TEXT NULL,
  `imagen` VARCHAR(500) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA DE CONFIGURACIONES
CREATE TABLE IF NOT EXISTS `configuraciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clave` VARCHAR(100) NOT NULL UNIQUE,
  `valor` TEXT NOT NULL,
  `descripcion` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA DE LEADS
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `telefono` VARCHAR(50) NULL,
  `mensaje` TEXT NULL,
  `origen` VARCHAR(100) DEFAULT 'web',
  `estado` ENUM('nuevo', 'contactado', 'convertido', 'descartado') DEFAULT 'nuevo',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA DE PEDIDOS CON WOMPI
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT DEFAULT NULL,
  `codigo_pedido` VARCHAR(50) NOT NULL UNIQUE,
  `nombre_cliente` VARCHAR(150) NOT NULL,
  `email_cliente` VARCHAR(150) NOT NULL,
  `telefono_cliente` VARCHAR(50) NOT NULL,
  `direccion_envio` TEXT NOT NULL,
  `ciudad_envio` VARCHAR(100) NOT NULL,
  `notas` TEXT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  `iva` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `costo_envio` DECIMAL(12,2) NOT NULL DEFAULT 10000,
  `total` DECIMAL(12,2) NOT NULL,
  `metodo_pago` VARCHAR(50) NOT NULL DEFAULT 'wompi',
  `wompi_referencia` VARCHAR(60) NULL UNIQUE,
  `wompi_transaction_id` VARCHAR(120) NULL,
  `wompi_evento_id` VARCHAR(120) NULL UNIQUE,
  `wompi_monto_centavos` BIGINT NULL,
  `wompi_pagado_at` DATETIME NULL,
  `estado` ENUM(
    'draft',
    'pendiente_pago',
    'pagado',
    'pendiente',
    'confirmado',
    'en_preparacion',
    'en_camino',
    'entregado',
    'cancelado'
  ) NOT NULL DEFAULT 'draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  INDEX `idx_estado` (`estado`),
  INDEX `idx_usuario` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA DE DETALLES DE PEDIDO
CREATE TABLE IF NOT EXISTS `pedido_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pedido_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `variante_id` INT DEFAULT NULL,
  `nombre_producto` VARCHAR(255) NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(12,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABLA DE RESERVAS TEMPORALES DE STOCK
CREATE TABLE IF NOT EXISTS `stock_reservas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pedido_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `variante_id` INT DEFAULT NULL,
  `cantidad` INT NOT NULL,
  `creado_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expira_at` TIMESTAMP NOT NULL,
  FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE,
  INDEX `idx_pedido` (`pedido_id`),
  INDEX `idx_producto` (`producto_id`),
  INDEX `idx_expira` (`expira_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABLA DE ESTADÍSTICAS Y VISITAS
CREATE TABLE IF NOT EXISTS `estadisticas_visitas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NULL,
  `pagina` VARCHAR(255) NOT NULL,
  `fecha` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_fecha` (`fecha`),
  INDEX `idx_pagina` (`pagina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABLA DE LOGS DE MODERACIÓN Y SEGURIDAD DEL CHAT
CREATE TABLE IF NOT EXISTS `chat_moderation_log` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `session_id`   VARCHAR(100)  NOT NULL,
  `ip`           VARCHAR(45)   NOT NULL,
  `mensaje`      TEXT          NOT NULL,
  `razon`        VARCHAR(100)  NOT NULL,   -- 'profanity' | 'jailbreak' | 'spam' | 'injection'
  `nivel`        TINYINT       NOT NULL DEFAULT 1, -- 1=advertencia, 2=bloqueo, 3=ban
  `created_at`   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_session` (`session_id`),
  INDEX `idx_ip`      (`ip`),
  INDEX `idx_razon`   (`razon`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABLA DE SESIONES E IPS BANEADAS DEL CHAT
CREATE TABLE IF NOT EXISTS `chat_session_bans` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `session_id`   VARCHAR(100)  NOT NULL,
  `ip`           VARCHAR(45)   NOT NULL,
  `razon`        VARCHAR(200)  NOT NULL,
  `banned_until` TIMESTAMP     NOT NULL,
  `created_at`   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_session` (`session_id`),
  INDEX `idx_ip`        (`ip`),
  INDEX `idx_banned_until` (`banned_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- FIN DE ESQUEMA UNIFICADO DE PRODUCCIÓN
-- ============================================================

