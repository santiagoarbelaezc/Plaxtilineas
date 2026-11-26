# 📚 Documentación de Manejo de Stock, Carrito y Caché (`Plaxtilineas` ↔ `Catalogo-Laravel`)

Esta carpeta contiene el análisis arquitectónico, la especificación completa de casos de uso de e-commerce y el plan de implementación para el control atómico de inventario y caché entre **Plaxtilineas** y **Catálogo**.

---

## 🗂️ Índice de Documentos

1. **[01_auditoria_y_diagnostico_actual.md](./01_auditoria_y_diagnostico_actual.md)**
   - Comparativa técnica del sistema de caché entre `catalogo-laravel` (`CatalogCacheService`) y `Plaxtilineas` (`CatalogoApiService` + `CatalogoService`).
   - Diagnóstico detallado de los **6 hallazgos críticos** identificados en el código actual (incompatibilidad en `/api/inventario/cambios`, auto-bloqueo en `verificarStock` al comprar las últimas unidades, inflación de stock por `clearCart()` durante el checkout de Wompi, bloqueo por pedidos `DRAFT` invisibles, falta de botón de reintento de pago y condiciones de carrera sin `lockForUpdate`).
2. **[02_casos_de_uso_y_manejo_de_fallos.md](./02_casos_de_uso_y_manejo_de_fallos.md)**
   - Máquina de estados del stock y del pedido.
   - Especificación detallada de los **14 Casos de Uso (CU-01 a CU-14)** cubriendo navegación en caché, adición al carrito, ajuste de cantidades (`+`/`-`), eliminación, expiración de carritos, verificación de stock en checkout, transferencia atómica `Carrito` → `StockReserva`, pagos aprobados, pagos declinados, reintentos de pago sin bloqueo, cancelaciones y expiración de órdenes.
   - Invariantes matemáticos de conservación de inventario.
3. **[03_plan_de_implementacion_y_arquitectura.md](./03_plan_de_implementacion_y_arquitectura.md)**
   - Plan técnico de cambios por archivo y fase en `catalogo-laravel`, `Plaxtilineas/backend-laravel` y `Plaxtilineas/frontend`, junto con la suite de pruebas de verificación.
