# Regla de Negocio: Envío a Domicilio (Mínimo \$50.000) y Recogida en Tienda (\$0)

## 1. Resumen de la regla

| Modalidad (`tipo_entrega`) | Compra mínima (subtotal) | Costo de envío | Evidencia de entrega (Admin) |
| :--- | :--- | :--- | :--- |
| **`domicilio`** (Envío a domicilio) | **\$50.000 COP** (cualquier ciudad) | **\$10.000 COP** | Obligatoria (foto en Cloudinary) |
| **`recogida_tienda`** (Recoger en tienda) | **Sin mínimo** (cualquier valor) | **\$0 COP (Gratis)** | Obligatoria (foto en Cloudinary) |

* **Sede de recogida:** Plaxtilineas — Sede Principal (`Cra. 19 #19-35, Armenia, Quindío`).
* **Horario de atención:** Lunes a Viernes 8:00 a.m. - 6:00 p.m. · Sábados 8:00 a.m. - 2:00 p.m.
* Todos los parámetros son configurables en `backend-laravel/config/business.php` (variables `COSTO_ENVIO_COP`, `ENVIO_COMPRA_MINIMA_COP`, `TIENDA_*`).

---

## 2. Arquitectura e Implementación

### Backend (`Plaxtilineas/backend-laravel`)
* **Migración:** `2026_11_26_000003_add_tipo_entrega_to_pedidos_table.php` agrega `pedidos.tipo_entrega` (`default('domicilio')`, retrocompatible con pedidos históricos).
* **Enum:** `App\Enums\TipoEntrega` (`domicilio`, `recogida_tienda`).
* **Endpoint de reglas:** `GET /api/pedidos/reglas-envio` retorna `compra_minima_domicilio`, `costo_envio` y `tienda`.
* **Fuente de verdad en servidor:** `CrearDraftPedidoAction` valida que `subtotal >= 50000` si `tipo_entrega === 'domicilio'` (retorna HTTP `422` si no cumple) y fuerza `costo_envio = 0` si `tipo_entrega === 'recogida_tienda'`. El total firmado para Wompi siempre coincide exactamente con el recalculado en BD.
* **Panel Admin y Correos:**
  * En `recogida_tienda` no se exige transportadora/guía ni se auto-promueve a `en_camino`; al marcar como **Entregado**, la evidencia fotográfica sigue siendo **obligatoria**.
  * `PagoConfirmadoMailable` muestra `Envío: $0 COP (Recogida en tienda)` junto con dirección y horario de la sede.

### Frontend (`Plaxtilineas/frontend`)
* **`/pago`:** selector de 2 tarjetas (**Envío a domicilio** vs **Recoger en tienda**). Si el subtotal es menor a \$50.000, la opción de domicilio se deshabilita indicando cuánto falta y se selecciona automáticamente **Recoger en tienda (\$0)**.
* **`/carrito`:** el resumen muestra el aviso del mínimo de \$50.000 y destaca la opción de recogida gratuita.
* **Mis Pedidos y Dashboard Admin:** identifican claramente los pedidos de **Recogida en Tienda (\$0)** y en el admin muestran el botón directo **Marcar como Entregado en Tienda (Adjuntar Evidencia)**.
