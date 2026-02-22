// config/db-hostinger.js
// Conexión a la base de datos Hostinger/MySQL alternativa

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.HOSTINGER_DB_HOST,
  user: process.env.HOSTINGER_DB_USER,
  password: process.env.HOSTINGER_DB_PASSWORD,
  database: process.env.HOSTINGER_DB_NAME,
  port: process.env.HOSTINGER_DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  timezone: '+00:00'
});

pool.on('error', (err) => {
  console.error('❌ Error en pool de Hostinger:', err.message);
});

module.exports = pool;
