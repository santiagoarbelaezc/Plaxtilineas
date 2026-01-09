require('dotenv').config();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// REMUEVE o COMENTA la conexión automática:
// (async () => {
//   try {
//     const connection = await db.getConnection();
//     console.log('✅ Conectado a MySQL en la nube (Hostinger)');
//     connection.release();
//   } catch (error) {
//     console.error('❌ Error conectando a MySQL en la nube:');
//     console.error(error.message);
//   }
// })();

module.exports = db;