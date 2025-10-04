const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const createStorage = (folderName = 'plaxtilineas_general') => {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: folderName,
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    })
  });
};

const fileFilter = (req, file, cb) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (validTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no permitido'), false);
  }
};

const createUploader = (folderName) => multer({
  storage: createStorage(folderName),
  fileFilter
});

module.exports = {
  cloudinary,
  createUploader
};
