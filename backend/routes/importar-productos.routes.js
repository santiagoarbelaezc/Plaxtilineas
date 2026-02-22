// routes/importar-productos.routes.js
/**
 * Rutas para importar productos desde la BD Hostinger
 * ⚠️ TODAS LAS RUTAS ESTÁN PROTEGIDAS - Solo administradores
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const controller = require('../controllers/importar-productos.controller');

// ==================== RUTAS PROTEGIDAS ====================
// Todas las rutas requieren autenticación (admin)

/**
 * GET /api/importar/preview
 * Obtener preview de productos de Hostinger SIN importarlos
 * Útil para revisar antes de hacer la importación
 */
router.get('/preview', verifyToken, controller.previewProductosHostinger);

/**
 * GET /api/importar/estadisticas
 * Obtener estadísticas de productos en Hostinger
 */
router.get('/estadisticas', verifyToken, controller.obtenerEstadisticasHostinger);

/**
 * POST /api/importar/ejecutar
 * ⚠️ CUIDADO: Importa TODOS los productos de Hostinger
 * Esta operación es irreversible
 */
router.post('/ejecutar', verifyToken, controller.importarProductosHostinger);

module.exports = router;
