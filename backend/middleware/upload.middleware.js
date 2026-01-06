// middleware/upload.middleware.js
const { 
  createImageUploadMiddleware, 
  createMultipleFilesUploadMiddleware 
} = require('../utils/upload.utils');

// Middlewares específicos para cada tipo de upload
const productUpload = createImageUploadMiddleware('plaxtilineas_productos', 'imagen', {
  maxSizeMB: 5,
  timeoutSeconds: 30
});

const categoryUpload = createImageUploadMiddleware('plaxtilineas_categorias', 'icono', {
  maxSizeMB: 2,
  timeoutSeconds: 25
});

const pqrsUpload = createMultipleFilesUploadMiddleware('plaxtilineas_pqrs', 'archivos', {
  maxFiles: 5,
  maxSizeMB: 10,
  timeoutSeconds: 45
});

const pqrsResponseUpload = createImageUploadMiddleware('plaxtilineas_pqrs', 'archivo', {
  maxSizeMB: 5,
  timeoutSeconds: 25
});

module.exports = {
  productUpload,
  categoryUpload,
  pqrsUpload,
  pqrsResponseUpload
};