-- ============================================================
-- MIGRACIÓN: Checkout Seguro + Wompi — Plaxtilineas
-- Fecha: 2026-06-17
-- ============================================================
-- INSTRUCCIONES: Ejecutar este script en la BD plaxtilineasDB
-- desde phpMyAdmin o CLI de MySQL.
-- ============================================================

-- 1. Ampliar ENUM de estados en pedidos (Two-Phase Commit)
ALTER TABLE pedidos
  MODIFY COLUMN estado ENUM(
    'draft',           -- Creado, esperando pago (NO toca stock)
    'pendiente_pago',  -- Widget Wompi abierto, esperando webhook
    'pagado',          -- Webhook APPROVED recibido ✅
    'pendiente',       -- En cola de procesamiento interno
    'confirmado',      -- Admin confirmó
    'en_preparacion',
    'en_camino',
    'entregado',
    'cancelado'
  ) NOT NULL DEFAULT 'draft';

-- 2. Agregar columnas de Wompi en pedidos
ALTER TABLE pedidos
  ADD COLUMN wompi_referencia      VARCHAR(60)   NULL AFTER metodo_pago,
  ADD COLUMN wompi_transaction_id  VARCHAR(120)  NULL AFTER wompi_referencia,
  ADD COLUMN wompi_evento_id       VARCHAR(120)  NULL AFTER wompi_transaction_id,
  ADD COLUMN wompi_monto_centavos  BIGINT        NULL AFTER wompi_evento_id,
  ADD COLUMN wompi_pagado_at       DATETIME      NULL AFTER wompi_monto_centavos,
  ADD COLUMN iva                   DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER subtotal,
  ADD COLUMN costo_envio           DECIMAL(12,2) NOT NULL DEFAULT 10000 AFTER iva;

-- Índices únicos para idempotencia y búsqueda rápida
ALTER TABLE pedidos
  ADD UNIQUE INDEX idx_wompi_referencia  (wompi_referencia),
  ADD UNIQUE INDEX idx_wompi_evento_id   (wompi_evento_id);

-- 3. Tabla de reservas temporales de stock (duración 30 min)
CREATE TABLE IF NOT EXISTS stock_reservas (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  pedido_id     INT           NOT NULL,
  producto_id   INT           NOT NULL,
  variante_id   INT           NULL,
  cantidad      INT           NOT NULL,
  creado_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  expira_at     DATETIME      NOT NULL,
  INDEX idx_pedido     (pedido_id),
  INDEX idx_producto   (producto_id),
  INDEX idx_expira     (expira_at),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
