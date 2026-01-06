// routes/categoria.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const { categoryUpload } = require('../middleware/upload.middleware');
const controller = require('../controllers/categoria.controller');

// ==================== RUTAS PÚBLICAS (sin middleware de upload) ====================

// Obtener todas las categorías
router.get('/', controller.obtenerCategorias);

// Obtener categorías con subcategorías
router.get('/con-subcategorias', controller.obtenerCategoriasConSubcategorias);

// Obtener ID de categoría por nombre
router.get('/id-por-nombre/:nombre', controller.obtenerIdCategoriaPorNombre);

// ==================== RUTAS PROTEGIDAS (con middleware de upload) ====================

// Crear categoría con ícono (requiere autenticación Y upload middleware)
router.post('/', verifyToken, categoryUpload, controller.crearCategoriaConIcono);

// Actualizar categoría (requiere autenticación Y upload middleware)
router.put('/:id', verifyToken, categoryUpload, controller.actualizarCategoria);

// Eliminar categoría (solo requiere autenticación)
router.delete('/:id', verifyToken, controller.eliminarCategoria);

module.exports = router;