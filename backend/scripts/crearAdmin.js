// scripts/crearAdmin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function crearUsuarioAdmin() {
  try {
    const nombre = 'Administrador';
    const correo = 'admin@plaxtilineas.com';
    const passwordPlano = '123456';
    const rol = 'admin';
    const estado = 'activo';

    console.log('🔄 Creando usuario administrador...');

    // Verificar si el usuario ya existe
    const [existingUsers] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    
    if (existingUsers.length > 0) {
      console.log('⚠️  El usuario ya existe en la base de datos');
      console.log('   📧 Correo:', correo);
      return;
    }

    // Encriptar la contraseña
    const hash = await bcrypt.hash(passwordPlano, 10);

    // Insertar usuario
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, correo, password, rol, estado) VALUES (?, ?, ?, ?, ?)',
      [nombre, correo, hash, rol, estado]
    );

    console.log('✅ Usuario administrador creado exitosamente:');
    console.log('----------------------------------');
    console.log(`🆔 ID: ${result.insertId}`);
    console.log(`👤 Nombre: ${nombre}`);
    console.log(`📧 Correo: ${correo}`);
    console.log(`🔑 Contraseña: ${passwordPlano}`);
    console.log(`🧩 Rol: ${rol}`);
    console.log(`🔘 Estado: ${estado}`);
    console.log('----------------------------------');
    console.log('\n💡 Credenciales para login:');
    console.log('   Email: admin@plaxtilineas.com');
    console.log('   Password: 123456');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error al crear usuario administrador:', err.message);
    
    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n💡 La tabla "usuarios" no existe. Ejecuta primero:');
      console.error('   node scripts/crearEsquemaCompleto.js');
    }
    
    process.exit(1);
  }
}

crearUsuarioAdmin();