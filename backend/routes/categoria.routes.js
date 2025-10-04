const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoria.controller');
const verifyToken = require('../middleware/auth.middleware');
const { createUploader } = require('../config/cloudinary'); // ✅ usamos la nueva función

// 👇 Uploader específico para categorías
const uploadCategoria = createUploader('plaxtilineas_categorias');

// Públicas
router.get('/', controller.obtenerCategorias);
router.get('/con-subcategorias', controller.obtenerCategoriasConSubcategorias);

// Protegidas
router.post('/', verifyToken, uploadCategoria.single('icono'), controller.crearCategoriaConIcono);
router.put('/:id', verifyToken, uploadCategoria.single('icono'), controller.actualizarCategoria);
router.delete('/:id', verifyToken, controller.eliminarCategoria);

module.exports = router;
