// utils/upload.utils.js
const { createUploader, uploadToCloudinary } = require('../config/cloudinary');

/**
 * Crea un middleware para procesar uploads de imágenes
 * @param {string} folderName - Nombre de la carpeta en Cloudinary
 * @param {string} fieldName - Nombre del campo en el formulario
 * @param {Object} options - Opciones adicionales
 * @returns {Function} Middleware de Express
 */
const createImageUploadMiddleware = (folderName, fieldName = 'imagen', options = {}) => {
  const {
    maxSizeMB = 5,
    timeoutSeconds = 30,
    allowedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
  } = options;

  // Crear middleware de Multer
  const multerMiddleware = createUploader(folderName, fieldName);
  
  return async (req, res, next) => {
    console.log(`📸 Iniciando upload para ${folderName}...`);
    
    // Procesar con Multer primero
    multerMiddleware(req, res, async (err) => {
      if (err) {
        return handleUploadError(res, err, 'Error al procesar la imagen');
      }
      
      // Si no hay archivo, continuar
      if (!req.file) {
        console.log(`ℹ️  No se subió nueva imagen para ${folderName}, continuando...`);
        return next();
      }
      
      // Validar archivo
      const validationError = validateFile(req.file, {
        maxSizeMB,
        allowedFormats
      });
      
      if (validationError) {
        return res.status(400).json({
          error: 'Archivo inválido',
          details: validationError
        });
      }
      
      console.log(`📦 Archivo recibido: ${req.file.originalname} (${formatFileSize(req.file.size)})`);
      
      try {
        // Subir a Cloudinary con timeout
        const cloudinaryResult = await uploadToCloudinaryWithTimeout(
          req.file.buffer,
          folderName,
          timeoutSeconds
        );
        
        // Agregar datos al request
        req.cloudinaryResult = {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id,
          format: cloudinaryResult.format,
          width: cloudinaryResult.width || 0,
          height: cloudinaryResult.height || 0,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        };
        
        console.log(`✅ Imagen subida exitosamente a ${folderName}: ${cloudinaryResult.public_id}`);
        next();
        
      } catch (cloudinaryError) {
        return handleCloudinaryError(res, cloudinaryError);
      }
    });
  };
};

/**
 * Sube archivo a Cloudinary con timeout controlado
 */
const uploadToCloudinaryWithTimeout = async (buffer, folderName, timeoutSeconds = 30) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout: Cloudinary no respondió en ${timeoutSeconds} segundos`));
    }, timeoutSeconds * 1000);
  });
  
  console.log(`☁️  Subiendo a Cloudinary (${folderName})...`);
  const cloudinaryPromise = uploadToCloudinary(buffer, folderName);
  
  const result = await Promise.race([cloudinaryPromise, timeoutPromise]);
  
  if (!result || !result.secure_url) {
    throw new Error('Respuesta inválida de Cloudinary');
  }
  
  return result;
};

/**
 * Valida un archivo antes de subirlo
 */
const validateFile = (file, options = {}) => {
  const { maxSizeMB = 5, allowedFormats = [] } = options;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return `El archivo es demasiado grande (${formatFileSize(file.size)}). Máximo permitido: ${maxSizeMB}MB`;
  }
  
  if (allowedFormats.length > 0 && !allowedFormats.includes(file.mimetype)) {
    const allowedExtensions = allowedFormats.map(mime => mime.split('/')[1]).join(', ');
    return `Formato no permitido. Solo se aceptan: ${allowedExtensions}`;
  }
  
  return null;
};

/**
 * Formatea el tamaño del archivo para mostrar
 */
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Maneja errores de Cloudinary
 */
const handleCloudinaryError = (res, error) => {
  console.error('❌ Error en Cloudinary:', {
    error: error.message,
    code: error.http_code,
    name: error.name
  });
  
  let statusCode = 500;
  let errorMessage = 'Error al subir la imagen a la nube';
  let errorDetails = 'Contacte al administrador';
  
  if (error.message.includes('Timeout')) {
    statusCode = 408;
    errorMessage = 'Tiempo de espera agotado';
    errorDetails = 'La subida de la imagen tardó demasiado. Intente con una imagen más pequeña o intente nuevamente.';
  } else if (error.http_code === 400) {
    statusCode = 400;
    errorMessage = 'Imagen inválida';
    errorDetails = error.message;
  } else if (error.message.includes('Invalid credentials')) {
    statusCode = 401;
    errorMessage = 'Error de autenticación con Cloudinary';
    errorDetails = 'Verifique las credenciales de Cloudinary';
  }
  
  return res.status(statusCode).json({
    error: errorMessage,
    details: errorDetails,
    timestamp: new Date().toISOString()
  });
};

/**
 * Maneja errores de upload
 */
const handleUploadError = (res, error, defaultMessage) => {
  console.error('❌ Error en upload:', error.message);
  
  if (error.message.includes('File too large')) {
    return res.status(400).json({
      error: 'Archivo demasiado grande',
      details: 'El archivo excede el tamaño máximo permitido'
    });
  }
  
  if (error.message.includes('Unexpected field')) {
    return res.status(400).json({
      error: 'Campo de archivo incorrecto',
      details: 'Verifique el nombre del campo en el formulario'
    });
  }
  
  return res.status(400).json({
    error: defaultMessage || 'Error al procesar el archivo',
    details: error.message
  });
};

/**
 * Middleware para múltiples archivos (para PQRS)
 */
const createMultipleFilesUploadMiddleware = (folderName, fieldName = 'archivos', options = {}) => {
  const {
    maxFiles = 5,
    maxSizeMB = 10,
    timeoutSeconds = 45,
    allowedFormats = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  } = options;
  
  const multer = require('multer');
  
  const multerMiddleware = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (allowedFormats.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no permitido'), false);
      }
    },
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
      files: maxFiles
    }
  }).array(fieldName, maxFiles);
  
  return async (req, res, next) => {
    console.log(`📁 Iniciando upload múltiple para ${folderName}...`);
    
    multerMiddleware(req, res, async (err) => {
      if (err) {
        return handleUploadError(res, err, 'Error al procesar los archivos');
      }
      
      if (!req.files || req.files.length === 0) {
        console.log(`ℹ️  No se subieron archivos para ${folderName}, continuando...`);
        return next();
      }
      
      console.log(`📦 ${req.files.length} archivos recibidos para ${folderName}`);
      
      try {
        req.cloudinaryResults = [];
        
        // Subir archivos en paralelo con límite de concurrencia
        const uploadPromises = req.files.map(file => 
          uploadToCloudinaryWithTimeout(file.buffer, folderName, timeoutSeconds)
            .then(result => ({
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              resource_type: result.resource_type,
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size
            }))
        );
        
        req.cloudinaryResults = await Promise.all(uploadPromises);
        console.log(`✅ ${req.cloudinaryResults.length} archivos subidos exitosamente a ${folderName}`);
        next();
        
      } catch (cloudinaryError) {
        return handleCloudinaryError(res, cloudinaryError);
      }
    });
  };
};

module.exports = {
  createImageUploadMiddleware,
  createMultipleFilesUploadMiddleware,
  validateFile,
  formatFileSize,
  uploadToCloudinaryWithTimeout,
  handleCloudinaryError,
  handleUploadError
};