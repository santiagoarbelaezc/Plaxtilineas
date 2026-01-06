// routes/producto.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const { productUpload } = require('../middleware/upload.middleware');
const controller = require('../controllers/producto.controller');

// ==================== RUTAS PÚBLICAS ====================

// IMPORTANTE: Las rutas específicas deben ir ANTES de las genéricas

// Productos por subcategoría
router.get('/subcategoria/:subcategoria_id', controller.obtenerProductosPorSubcategoria);

// Productos por categoría 
router.get('/categoria/:categoria_id', controller.obtenerProductosPorCategoria);

// Verificar variantes de producto
router.get('/:producto_id/variantes', controller.verificarVariantesProducto);

// Productos relacionados
router.get('/relacionados/por-producto', controller.obtenerProductosRelacionados);

// Búsqueda avanzada
router.get('/busqueda-avanzada', controller.busquedaAvanzada);

// Estadísticas de productos
router.get('/estadisticas', controller.obtenerEstadisticasProductos);

// Productos por nombre (búsqueda simple)
router.get('/buscar', controller.buscarProductosPorNombre);

// Productos aleatorios (interés)
router.get('/interes/aleatorios', controller.obtenerProductosAleatorios);

// Últimos productos (novedades)
router.get('/novedades/ultimos', controller.obtenerUltimosProductos);

// Obtener producto por ID (esta debe estar DESPUÉS de las rutas específicas)
router.get('/:id', controller.obtenerProductoPorId);

// Obtener todos los productos (última ruta)
router.get('/', controller.obtenerProductos);

// ==================== RUTAS PROTEGIDAS ====================

// Crear producto
router.post('/', verifyToken, productUpload, controller.crearProductoDesdeRuta);

// Actualizar producto
router.put('/:id', verifyToken, productUpload, controller.actualizarProducto);

// Eliminar producto
router.delete('/:id', verifyToken, controller.eliminarProducto);

module.exports = router;