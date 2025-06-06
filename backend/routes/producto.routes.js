const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary'); // trae multer configurado con Cloudinary
const controller = require('../controllers/producto.controller');

// Rutas públicas
router.get('/', controller.obtenerProductos);

// Rutas protegidas con imagen enviada desde Angular como FormData
router.post('/', verifyToken, upload.single('imagen'), controller.crearProductoDesdeRuta);
router.put('/:id', verifyToken, upload.single('imagen'), controller.actualizarProducto);
router.delete('/:id', verifyToken, controller.eliminarProducto);

module.exports = router;
