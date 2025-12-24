const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const { createUploader } = require('../config/cloudinary'); // ✅ ahora traemos la función
const controller = require('../controllers/producto.controller');
const uploadProducto = createUploader('plaxtilineas_productos');

// Rutas públicas
router.get('/', controller.obtenerProductos);
router.get('/:id', controller.obtenerProductoPorId);

// Nuevas rutas públicas para productos relacionados y de interés
router.get('/subcategoria/:subcategoria_id', controller.obtenerProductosPorSubcategoria);
router.get('/interes/aleatorios', controller.obtenerProductosAleatorios);

// Rutas protegidas con imagen enviada desde Angular como FormData
router.post('/', verifyToken, uploadProducto.single('imagen'), controller.crearProductoDesdeRuta);
router.put('/:id', verifyToken, uploadProducto.single('imagen'), controller.actualizarProducto);
router.delete('/:id', verifyToken, controller.eliminarProducto);

module.exports = router;
