# 📦 Importación de Productos desde Hostinger

Este módulo permite importar productos desde la base de datos Hostinger hacia la base de datos local, con conversión automática de formatos.

## 🔧 Requisitos

- Las credenciales de Hostinger configuradas en las variables de entorno .env
- Acceso a ambas bases de datos

## 📋 Variables de Entorno Requeridas

Agregar a tu archivo `.env`:

```env
# Hostinger BD - Configurar con tus credenciales
HOSTINGER_DB_HOST=tu_host_de_hostinger
HOSTINGER_DB_USER=tu_usuario_de_hostinger
HOSTINGER_DB_PASSWORD=tu_password_de_hostinger
HOSTINGER_DB_NAME=tu_base_de_datos_hostinger
HOSTINGER_DB_PORT=3306
```

## 🚀 Cómo Usar

### Opción 1: Usando el Script (recomendado)

#### Ver preview (sin importar)
```bash
cd backend
node scripts/importarProductosHostinger.js preview
```
Esto mostrará:
- 5 productos de muestra
- Estadísticas generales
- Total de productos por categoría

#### Ejecutar importación completa
```bash
cd backend
node scripts/importarProductosHostinger.js ejecutar
```
⚠️ **Advertencia**: Esta operación es irreversible

### Opción 2: Usando los Endpoints REST

#### 1. Obtener preview de productos
```bash
curl -X GET http://localhost:8080/api/importar/preview \
  -H "Authorization: Bearer <TU_TOKEN_JWT>"
```

#### 2. Obtener estadísticas de Hostinger
```bash
curl -X GET http://localhost:8080/api/importar/estadisticas \
  -H "Authorization: Bearer <TU_TOKEN_JWT>"
```

#### 3. Ejecutar importación
```bash
curl -X POST http://localhost:8080/api/importar/ejecutar \
  -H "Authorization: Bearer <TU_TOKEN_JWT>" \
  -H "Content-Type: application/json"
```

## 🔄 Mapeo de Datos

### Campos Mapeados

| Campo Hostinger | Campo Local | Notas |
|---|---|---|
| `products.id` | Descartado | Se genera nuevo ID |
| `products.name` | `productos.nombre` | Requerido |
| `products.description` | `productos.descripcion` | Longtext |
| `product_variants.price` | `productos.precio` | Primera variante con precio |
| `product_images.url` | `productos.imagen_url` | Solo la primera imagen |
| `products.category` | `productos.subcategoria_id` | Se mapea automáticamente |
| - | `productos.cantidad` | Se establece en 1 |
| - | `productos.unidad` | Se establece en 'unidad' |
| - | `productos.creado_en` | Timestamp actual |

### Mapeo de Categorías

El sistema intenta mapear las categorías automáticamente en este orden:
1. Busca una subcategoría con el mismo nombre
2. Busca una categoría con el mismo nombre y usa su primera subcategoría
3. Si no encuentra nada, usa la primera subcategoría disponible
4. **Fallback**: Usa subcategoría ID 1

## ⚙️ Configuración del Mapeo (Avanzado)

Si necesitas personalizar el mapeo de categorías, edita la función `mapearCategoriaASubcategoria` en:
- `controllers/importar-productos.controller.js` (para endpoints)
- `scripts/importarProductosHostinger.js` (para script)

## 📊 Resultado de la Importación

### Respuesta Exitosa

```json
{
  "mensaje": "Importación completada",
  "total_procesados": 50,
  "importados_exitosamente": 48,
  "errores": 2,
  "detalles_errores": [
    {
      "producto_id": 5,
      "nombre": "Producto problemático",
      "error": "Mensaje de error específico"
    }
  ]
}
```

### Log de Consola

```
✅ Importando productos desde Hostinger

📦 Total de productos a importar: 50

✅ Importados: 50/50 (100%)

──────────────────────────────────────────
✅ IMPORTACIÓN COMPLETADA

📦 Productos importados exitosamente: 50/50
──────────────────────────────────────────
```

## ⚠️ Consideraciones Importantes

1. **Irreversible**: La importación no se puede deshacer fácilmente. Haz backup antes.
2. **IDs Nuevos**: Los productos importados tendrán IDs nuevos en la BD local.
3. **Categorías**: Verifica que tus subcategorías/categorías existan antes de importar.
4. **Imágenes**: Solo se importa la primera imagen. Otras imágenes se ignoran.
5. **Variantes**: Solo se usa el primer precio de variantes. Otros datos se ignoran.
6. **Tokens**: Para los endpoints REST, necesitas un token JWT válido (admin).

## 🔍 Diagnóstico

### Verificar conexión a Hostinger
```bash
node -e "
const pool = require('./config/db-hostinger');
pool.query('SELECT COUNT(*) as total FROM products')
  .then(([rows]) => console.log('✅ Conexión OK:', rows[0]))
  .catch(err => console.error('❌ Error:', err.message));
"
```

### Ver estadísticas sin importar
```bash
node scripts/importarProductosHostinger.js preview
```

## 🛠️ Troubleshooting

| Problema | Solución |
|---|---|
| "Error de conexión a Hostinger" | Verifica las credenciales en .env |
| "Categoría no encontrada" | Crea las categorías/subcategorías correspondientes primero |
| "Error al insertar productos" | Verifica el esquema de la BD local |
| "Transacción revertida" | Revisa los logs para el error específico |

## 📝 Historial de Importaciones

Por ahora no se mantiene historial automático. Para registrar importaciones:

```sql
-- Crear tabla de auditoría (opcional)
CREATE TABLE importaciones_hostinger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cantidad_importada INT,
  cantidad_errores INT,
  fecha_importacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ejecutada_por VARCHAR(255),
  detalles LONGTEXT
);
```

---

**Última actualización**: Febrero 2026
**Versión**: 1.0.0
