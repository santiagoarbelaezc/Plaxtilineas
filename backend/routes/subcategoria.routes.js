const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const controller = require('../controllers/subcategoria.controller');

router.get('/', controller.obtenerSubcategorias);
router.post('/', verifyToken, controller.crearSubcategoria);
router.put('/:id', verifyToken, controller.actualizarSubcategoria);
router.delete('/:id', verifyToken, controller.eliminarSubcategoria);

module.exports = router;
