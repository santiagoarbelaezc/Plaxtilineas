const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🔍 Función para probar la conexión a Cloudinary
async function testCloudinaryConnection() {
  try {
    console.log('\n☁️  Probando conexión a Cloudinary...');
    
    // Verificar que las variables de entorno estén definidas
    const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Variables de entorno faltantes para Cloudinary:');
      missingVars.forEach(varName => console.error(`   📌 ${varName}`));
      return false;
    }
    
    console.log('   ✅ Variables de entorno configuradas');
    console.log(`   🌩️  Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   🔑 API Key: ${process.env.CLOUDINARY_API_KEY?.substring(0, 8)}...`);
    
    // Probar la conexión intentando listar recursos (opción más liviana)
    const result = await cloudinary.api.ping();
    
    if (result.status === 'ok') {
      console.log('✅ Conexión a Cloudinary exitosa');
      console.log(`   ⚡ Respuesta: ${result.status} (${result.message || 'Servicio disponible'})`);
      return true;
    } else {
      console.error('❌ Cloudinary respondió con error:', result);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error conectando a Cloudinary:');
    console.error(`   🔍 Tipo: ${error.name}`);
    console.error(`   📝 Mensaje: ${error.message}`);
    console.error('💡 Solución:');
    console.error('   1. Verifica tus credenciales de Cloudinary');
    console.error('   2. Verifica tu conexión a internet');
    console.error('   3. Asegúrate de que tu cuenta de Cloudinary esté activa');
    return false;
  }
}

// 🔍 Versión alternativa más simple (sin hacer ping)
async function testCloudinaryConfig() {
  try {
    console.log('\n☁️  Verificando configuración de Cloudinary...');
    
    // Verificar configuración básica
    const config = cloudinary.config();
    
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.error('❌ Configuración de Cloudinary incompleta');
      console.error(`   Cloud Name: ${config.cloud_name || 'FALTANTE'}`);
      console.error(`   API Key: ${config.api_key ? '✓ Configurado' : 'FALTANTE'}`);
      console.error(`   API Secret: ${config.api_secret ? '✓ Configurado' : 'FALTANTE'}`);
      return false;
    }
    
    console.log('✅ Configuración de Cloudinary correcta:');
    console.log(`   🌩️  Cloud Name: ${config.cloud_name}`);
    console.log(`   🔑 API Key: ${config.api_key.substring(0, 8)}...`);
    console.log(`   🔒 API Secret: ${config.api_secret ? '✓ Configurado' : 'FALTANTE'}`);
    console.log('   📌 Nota: Para probar la conexión real, se necesita una operación');
    
    return true;
  } catch (error) {
    console.error('❌ Error en configuración de Cloudinary:', error.message);
    return false;
  }
}

// Función para crear storage
const createStorage = (folderName = 'plaxtilineas_general') => {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: folderName,
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    })
  });
};

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (validTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no permitido'), false);
  }
};

// Crear uploader
const createUploader = (folderName) => multer({
  storage: createStorage(folderName),
  fileFilter
});



module.exports = {
  cloudinary,
  createUploader,
  testCloudinaryConnection,  // Exportar para usarla manualmente
  testCloudinaryConfig       // Exportar para usarla manualmente
};