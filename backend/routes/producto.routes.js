const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const { createUploader } = require('../config/cloudinary'); // ✅ ahora traemos la función
const controller = require('../controllers/producto.controller');
const uploadProducto = createUploader('plaxtilineas_productos');

// Rutas públicas
router.get('/', controller.obtenerProductos);

// Rutas protegidas con imagen enviada desde Angular como FormData
router.post('/', verifyToken, uploadProducto.single('imagen'), controller.crearProductoDesdeRuta);
router.put('/:id', verifyToken, uploadProducto.single('imagen'), controller.actualizarProducto);
router.delete('/:id', verifyToken, controller.eliminarProducto);

module.exports = router;
