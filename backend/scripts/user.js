// scripts/crearUsuarioTest.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // 👈 Ruta correcta hacia config/db.js

async function crearUsuarioTest() {
  try {
    const nombre = 'Administrador';
    const correo = 'admin@plaxtilineas.com';
    const passwordPlano = '123456';
    const rol = 'admin';

    console.log('🔄 Creando usuario de prueba...');

    // Encriptar la contraseña
    const hash = await bcrypt.hash(passwordPlano, 10);

    // Insertar usuario
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, hash, rol]
    );

    console.log('✅ Usuario creado exitosamente:');
    console.log('----------------------------------');
    console.log(`🆔 ID: ${result.insertId}`);
    console.log(`📧 Correo: ${correo}`);
    console.log(`🔑 Contraseña: ${passwordPlano}`);
    console.log(`🧩 Rol: ${rol}`);
    console.log('----------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error al crear usuario:', err.message);
    process.exit(1);
  }
}

crearUsuarioTest();
