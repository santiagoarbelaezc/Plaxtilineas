// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');
require('dotenv').config();

// Configurar Cloudinary con timeout
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 30000 // 30 segundos timeout global
});

// 🔧 FUNCIÓN SIMPLIFICADA Y CORRECTA
const createUploader = (folderName = 'plaxtilineas_general', fieldName = 'imagen') => {
  console.log(`📁 Configurando uploader para carpeta: ${folderName}, campo: ${fieldName}`);
  
  // Middleware de Multer para memoria
  const multerMiddleware = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (validTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Formato de imagen no permitido. Solo JPEG, PNG, JPG, WEBP'), false);
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
  });
  
  // Retorna el middleware ya configurado
  return multerMiddleware.single(fieldName);
};

// Función para subir archivo a Cloudinary con timeout controlado
const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    console.log(`☁️  Iniciando upload a carpeta: ${folderName}`);
    
    // Configurar timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout: Cloudinary no respondió en 25 segundos'));
    }, 25000); // 25 segundos para upload
    
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          transformation: [{ width: 800, height: 600, crop: 'limit' }]
        },
        (error, result) => {
          clearTimeout(timeoutId); // Limpiar timeout
          
          if (error) {
            console.error('❌ Error en callback de Cloudinary:', error);
            reject(error);
          } else {
            console.log(`✅ Upload completado: ${result.public_id}`);
            resolve(result);
          }
        }
      );
      
      // Manejar errores en el stream
      uploadStream.on('error', (streamError) => {
        clearTimeout(timeoutId);
        console.error('❌ Error en stream de upload:', streamError);
        reject(streamError);
      });
      
      // Crear y enviar el stream
      const readableStream = streamifier.createReadStream(fileBuffer);
      readableStream.pipe(uploadStream);
      
      // Manejar errores en el stream de lectura
      readableStream.on('error', (readError) => {
        clearTimeout(timeoutId);
        console.error('❌ Error en stream de lectura:', readError);
        reject(readError);
      });
      
    } catch (setupError) {
      clearTimeout(timeoutId);
      console.error('❌ Error configurando upload:', setupError);
      reject(setupError);
    }
  });
};

// 🔍 Función para probar la conexión a Cloudinary (con timeout)
async function testCloudinaryConnection() {
  try {
    console.log('\n☁️  Probando conexión a Cloudinary...');
    
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
    
    // Test con timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout en ping a Cloudinary')), 10000);
    });
    
    const pingPromise = cloudinary.api.ping();
    const result = await Promise.race([pingPromise, timeoutPromise]);
    
    if (result.status === 'ok') {
      console.log('✅ Conexión a Cloudinary exitosa');
      console.log(`   ⚡ Respuesta: ${result.status} (${result.message || 'Servicio disponible'})`);
      return true;
    } else {
      console.error('❌ Cloudinary respondió con error:', result);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error conectando a Cloudinary:', error.message);
    return false;
  }
}

// 🔍 Verificación simple de configuración
async function testCloudinaryConfig() {
  try {
    console.log('\n☁️  Verificando configuración de Cloudinary...');
    
    const config = cloudinary.config();
    
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.error('❌ Configuración de Cloudinary incompleta');
      return false;
    }
    
    console.log('✅ Configuración de Cloudinary correcta:');
    console.log(`   🌩️  Cloud Name: ${config.cloud_name}`);
    console.log(`   🔑 API Key: ${config.api_key.substring(0, 8)}...`);
    
    return true;
  } catch (error) {
    console.error('❌ Error en configuración de Cloudinary:', error.message);
    return false;
  }
}

module.exports = {
  cloudinary,
  createUploader,
  uploadToCloudinary,
  testCloudinaryConnection,
  testCloudinaryConfig
};