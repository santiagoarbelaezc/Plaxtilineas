// scripts/crearEsquemaCompleto.js
require('dotenv').config();
const db = require('../config/db');

async function crearEsquemaCompleto() {
  try {
    console.log('🔄 Creando esquema completo de la base de datos...');
    
    // 1. Tabla categorias
    console.log('📁 Creando tabla categorias...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        icono_url VARCHAR(500),
        icono_public_id VARCHAR(255),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla categorias creada');
    
    // 2. Tabla subcategorias
    console.log('📁 Creando tabla subcategorias...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS subcategorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        categoria_id INT NOT NULL,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla subcategorias creada');
    
    // 3. Tabla productos
    console.log('📁 Creando tabla productos...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        cantidad INT DEFAULT 0,
        precio DECIMAL(10, 2) NOT NULL,
        imagen_url VARCHAR(500),
        public_id VARCHAR(255),
        subcategoria_id INT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla productos creada');
    
    // 4. Tabla usuarios (con estado como ENUM)
    console.log('📁 Creando tabla usuarios...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol ENUM('admin', 'usuario') DEFAULT 'usuario',
        estado ENUM('activo', 'inactivo') DEFAULT 'activo',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla usuarios creada');
    
    // Verificar todas las tablas creadas
    const [tables] = await db.query("SHOW TABLES");
    console.log('\n📊 Tablas existentes en la base de datos:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   • ${tableName}`);
    });
    
    console.log('\n🎉 Esquema completo creado exitosamente!');
    console.log('\n📋 Resumen de tablas:');
    console.log('   1. categorias - Almacena categorías principales');
    console.log('   2. subcategorias - Subcategorías relacionadas a categorías');
    console.log('   3. productos - Productos con referencias a subcategorías');
    console.log('   4. usuarios - Usuarios del sistema con roles');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al crear esquema:');
    console.error('   Código:', err.code);
    console.error('   Mensaje:', err.message);
    console.error('   SQL:', err.sql || 'No disponible');
    process.exit(1);
  }
}

crearEsquemaCompleto();