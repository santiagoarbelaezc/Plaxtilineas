require('dotenv').config(); // Cargar variables del archivo .env

const mysql = require('mysql2/promise'); // Cliente MySQL con promesas

// Crear un pool de conexiones reutilizables
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;
