const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const controller = require('../controllers/variante.controller');

// Rutas públicas
router.get('/producto/:producto_id', controller.obtenerVariantesPorProducto);

// Rutas protegidas (Admin)
router.post('/', verifyToken, controller.crearVariante);
router.delete('/:id', verifyToken, controller.eliminarVariante);

module.exports = router;