require('dotenv').config();

const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Prueba de conexión simple
db.getConnection()
  .then(connection => {
    console.log('✅ Conexión a MySQL establecida correctamente');
    connection.release();
  })
  .catch(error => {
    console.error('❌ Error conectando a MySQL:', error.message);
  });

module.exports = db;