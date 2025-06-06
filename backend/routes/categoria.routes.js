const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });
const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoria.controller');
const verifyToken = require('../middleware/auth.middleware');

// Públicas
router.get('/', controller.obtenerCategorias);
router.get('/con-subcategorias', controller.obtenerCategoriasConSubcategorias);

// Protegidas
router.post('/', verifyToken, upload.single('icono'), controller.crearCategoriaConIcono);
router.put('/:id', verifyToken, upload.single('icono'), controller.actualizarCategoria);
router.delete('/:id', verifyToken, controller.eliminarCategoria);

module.exports = router;
