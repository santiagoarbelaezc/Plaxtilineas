ALTER TABLE usuarios
  ADD COLUMN email_verificado  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '0=pendiente, 1=verificado',
  ADD COLUMN token_verificacion VARCHAR(100) NULL     COMMENT 'UUID o hash para verificar el email',
  ADD COLUMN token_expira_en   DATETIME     NULL     COMMENT 'Fecha de caducidad del token de verificación';
