// routes/pqrs.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const { pqrsUpload, pqrsResponseUpload } = require('../middleware/upload.middleware');
const controller = require('../controllers/pqrs.controller');

// ==================== RUTAS PÚBLICAS ====================

// Crear nueva PQR (pública)
router.post('/', pqrsUpload, controller.crearPQR);

// Consultar PQR por ID/ticket (pública)
router.get('/consulta/:id', controller.obtenerPQRPorId);

// ==================== RUTAS PROTEGIDAS ====================

// Obtener todas las PQRS (admin)
router.get('/', verifyToken, controller.obtenerPQRS);

// Buscar PQRS (admin)
router.get('/buscar', verifyToken, controller.buscarPQRS);

// Estadísticas (admin)
router.get('/estadisticas', verifyToken, controller.obtenerEstadisticas);

// Últimas PQRS (admin)
router.get('/ultimas', verifyToken, controller.obtenerUltimaPQR);

// Actualizar estado (admin)
router.put('/:id/estado', verifyToken, controller.actualizarEstadoPQR);

// Agregar respuesta (admin)
router.post('/:id/respuestas', verifyToken, pqrsResponseUpload, controller.agregarRespuesta);

// Eliminar PQR (admin)
router.delete('/:id', verifyToken, controller.eliminarPQR);

module.exports = router;