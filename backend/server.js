const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar la base de datos (esto ejecutará testConnection automáticamente)
const db = require('./config/db');

// Importar Cloudinary con funciones de test
const { testCloudinaryConnection, testCloudinaryConfig } = require('./config/cloudinary');

// 🔌 Inicializar app
const app = express();
const PORT = process.env.PORT || 3000;

// 📦 Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔁 Rutas API
const authRoutes = require('./routes/auth.routes');
const productoRoutes = require('./routes/producto.routes');
const subcategoriaRoutes = require('./routes/subcategoria.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const varianteRoutes = require('./routes/variante.routes');
const pqrsRoutes = require('./routes/pqrs.routes'); // ✅ NUEVA RUTA PQRS

app.use('/api/auth', authRoutes);
app.use('/api/subcategorias', subcategoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/variantes', varianteRoutes);
app.use('/api/pqrs', pqrsRoutes); // ✅ AGREGAR AQUÍ

// 🌐 Servir Angular compilado solo si existe (evita errores en desarrollo)
const angularPath = path.join(__dirname, '../frontend/dist/frontend');
app.use(express.static(angularPath));

// 🏠 Ruta SPA: solo si frontend existe
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(angularPath, 'index.html'));
  } catch (err) {
    res.status(404).json({ error: 'Vista no disponible (¿Angular no compilado?)' });
  }
});

// 🧱 Middleware global de manejo de errores (agregado)
app.use((err, req, res, next) => {
  console.error('🔥 Error global no controlado:');
  console.dir(err, { depth: null });
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// 🚀 Iniciar servidor con verificaciones
async function startServer() {
  try {
    // Verificar Cloudinary (opcional, solo si tienes las variables configuradas)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('\n☁️  Verificando Cloudinary...');
      await testCloudinaryConfig();
      // Si quieres prueba completa, descomenta:
      // await testCloudinaryConnection();
    } else {
      console.log('ℹ️  Cloudinary no configurado (opcional para desarrollo)');
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor iniciado:`);
      console.log(`✅ Backend escuchando en http://localhost:${PORT}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Base de datos: ${process.env.DB_NAME || 'plaxtilineas'}`);
      console.log(`🎯 Rutas API disponibles:`);
      console.log(`   • /api/auth ✅ Autenticación`);
      console.log(`   • /api/pqrs ✅ NUEVO SISTEMA PQRS`);
      console.log(`\n📋 Endpoints PQRS:`);
      console.log(`   🔓 POST   /api/pqrs              → Crear nueva PQR (público)`);
      console.log(`   🔓 GET    /api/pqrs/consulta/:id → Consultar PQR (público)`);
      
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error.message);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('🔥 Error no manejado en promesa:', err);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Excepción no capturada:', err);
});