const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar la base de datos (esto ejecutará testConnection automáticamente)
const db = require('./config/db');

// Importar Cloudinary con funciones de test
const { testCloudinaryConnection, testCloudinaryConfig } = require('./config/cloudinary');

// 🔌 Inicializar app
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0'; // IMPORTANTE para EB

// 🔥 CORS FIX - DESDE VARIABLE DE ENTORNO (OPCIÓN 1)
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:4200'];

console.log('🔧 Orígenes CORS configurados:', corsOrigins);

app.use((req, res, next) => {
  // Limpiar headers CORS previos (Load Balancer EB)
  res.removeHeader('Access-Control-Allow-Origin');
  
  const origin = req.headers.origin;
  
  // Permitir origen si está en la lista
  if (corsOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 📦 Middleware (DESPUÉS del CORS manual)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔁 Rutas API
const authRoutes = require('./routes/auth.routes');
const productoRoutes = require('./routes/producto.routes');
const subcategoriaRoutes = require('./routes/subcategoria.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const varianteRoutes = require('./routes/variante.routes');
const pqrsRoutes = require('./routes/pqrs.routes');

app.use('/api/auth', authRoutes);
app.use('/api/subcategorias', subcategoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/variantes', varianteRoutes);
app.use('/api/pqrs', pqrsRoutes);

// 🩹 HEALTH CHECK - CRÍTICO PARA ELASTIC BEANSTALK
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Plaxtilineas Backend API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    dbConnected: !!process.env.DB_HOST,
    corsOrigins: corsOrigins.join(', '),
    corsEnv: process.env.CORS_ORIGIN || 'not set'
  });
});

// 🏠 Ruta raíz - información de API
app.get('/', (req, res) => {
  res.json({
    message: 'Plaxtilineas Backend API',
    version: '1.0.0',
    baseUrl: process.env.BACKEND_URL || 'https://plaxti-prod.eba-vrgnhchj.sa-east-1.elasticbeanstalk.com',
    endpoints: {
      auth: '/api/auth',
      productos: '/api/productos',
      categorias: '/api/categorias',
      subcategorias: '/api/subcategorias',
      variantes: '/api/variantes',
      pqrs: '/api/pqrs',
      health: '/health'
    },
    documentation: 'Consulta la documentación interna',
    status: 'operational',
    corsOrigins: corsOrigins
  });
});

// ✅ BACKEND ONLY MODE - Optimizado para Elastic Beanstalk
console.log('ℹ️ Modo Backend API - Frontend excluido (Elastic Beanstalk deployment)');

// Ruta catch-all para API (solo backend)
app.get('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint no encontrado',
    message: 'Usa /health, /, o /api/*',
    availableRoutes: ['/', '/health', '/api/auth/*', '/api/productos/*', '/api/categorias/*']
  });
});

// 🧱 Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('🔥 Error global no controlado:');
  console.error(err.stack);
  
  // Para EB, es mejor no exponer detalles internos en producción
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: isProduction ? 'Error interno del servidor' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 🚀 Iniciar servidor con verificaciones
async function startServer() {
  try {
    console.log('🔧 Iniciando configuración del servidor...');
    console.log('📊 Entorno:', process.env.NODE_ENV || 'development');
    console.log('🌐 Puerto:', PORT);
    console.log('🏠 Host:', HOST);
    console.log('🔗 CORS_ORIGIN:', process.env.CORS_ORIGIN || 'no configurado');
    
    // Verificar Cloudinary (opcional)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('☁️ Verificando Cloudinary...');
      await testCloudinaryConfig();
    } else {
      console.log('ℹ️ Cloudinary no configurado');
    }
    
    // Iniciar servidor (IMPORTANTE: usar HOST para EB)
    app.listen(PORT, HOST, () => {
      console.log(`\n✅ SERVIDOR INICIADO CORRECTAMENTE`);
      console.log(`🎯 URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
      console.log(`📊 Health Check: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
      console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'https://plaxtilineas.com'}`);
      console.log(`\n🔧 Variables detectadas:`);
      console.log(`  • NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.log(`  • DB_HOST: ${process.env.DB_HOST ? '✓ configurado' : '✗ no configurado'}`);
      console.log(`  • CLOUDINARY: ${process.env.CLOUDINARY_CLOUD_NAME ? '✓ configurado' : '✗ no configurado'}`);
      console.log(`  • CORS_ORIGIN: ${process.env.CORS_ORIGIN ? '✓ configurado' : '✗ no configurado'}`);
      console.log(`\n🚀 Listo para recibir peticiones desde: ${corsOrigins.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO al iniciar servidor:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('🔥 Unhandled Promise Rejection:', err.message);
  console.error(err.stack);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Exportar app para testing (opcional)
module.exports = app;
