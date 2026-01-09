// scripts/crearAdmin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function crearUsuarioAdmin() {
  try {
    const {
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ADMIN_ROLE,
      ADMIN_STATE
    } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios');
    }

    const nombre = ADMIN_NAME || 'Administrador';
    const correo = ADMIN_EMAIL;
    const rol = ADMIN_ROLE || 'admin';
    const estado = ADMIN_STATE || 'activo';

    console.log('🔄 Verificando usuario administrador...');

    const [existingUsers] = await db.query(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (existingUsers.length > 0) {
      console.log('✔️ El usuario admin ya existe, no se realizó ninguna acción');
      process.exit(0);
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await db.query(
      'INSERT INTO usuarios (nombre, correo, password, rol, estado) VALUES (?, ?, ?, ?, ?)',
      [nombre, correo, hash, rol, estado]
    );

    console.log('✅ Usuario administrador creado correctamente');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error al crear admin:', err.message);

    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.error('💡 Ejecuta primero: node scripts/crearEsquemaCompleto.js');
    }

    process.exit(1);
  }
}

crearUsuarioAdmin();
