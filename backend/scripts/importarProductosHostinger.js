#!/usr/bin/env node
/**
 * 🔄 Script para importar productos desde BD Hostinger
 * Uso: node scripts/importarProductosHostinger.js [preview|ejecutar]
 * 
 * Ejemplos:
 *   node scripts/importarProductosHostinger.js preview    // Ver preview sin importar
 *   node scripts/importarProductosHostinger.js ejecutar   // Importar todos los productos
 */

require('dotenv').config();
const db = require('../config/db');
const dbHostinger = require('../config/db-hostinger');

const args = process.argv.slice(2);
const accion = args[0] || 'preview';

if (!['preview', 'ejecutar'].includes(accion)) {
  console.error('❌ Acción inválida. Use: "preview" o "ejecutar"');
  process.exit(1);
}

/**
 * Verificar si un producto ya existe en la BD local
 */
const verificarProductoDuplicado = async (nombre) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM productos WHERE nombre = ? LIMIT 1',
      [nombre]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('❌ Error al verificar duplicado:', err.message);
    return false;
  }
};

/**
 * Obtener o crear categoría por nombre
 */
const obtenerOCrearCategoria = async (categoriaNombre) => {
  try {
    if (!categoriaNombre) {
      // Si no tiene nombre, usar "Plaxtilineas"
      const [rows] = await db.query(
        'SELECT id FROM categorias WHERE nombre = ? LIMIT 1',
        ['Plaxtilineas']
      );
      if (rows.length > 0) {
        return rows[0].id;
      }
      
      // Crear categoría por defecto
      const [result] = await db.query(
        'INSERT INTO categorias (nombre) VALUES (?)',
        ['Plaxtilineas']
      );
      console.log('✨ Categoría "Plaxtilineas" creada');
      return result.insertId;
    }
    
    // Buscar categoría existente
    const [rows] = await db.query(
      'SELECT id FROM categorias WHERE nombre = ? LIMIT 1',
      [categoriaNombre]
    );
    
    if (rows.length > 0) {
      return rows[0].id;
    }
    
    // Si no existe, crearla
    const [result] = await db.query(
      'INSERT INTO categorias (nombre) VALUES (?)',
      [categoriaNombre]
    );
    console.log(`✨ Categoría "${categoriaNombre}" creada`);
    return result.insertId;
    
  } catch (err) {
    console.error('❌ Error al obtener/crear categoría:', err.message);
    throw err;
  }
};

/**
 * Obtener la primera subcategoría de una categoría
 */
const obtenerPrimeraSubcategoria = async (categoriaId) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM subcategorias WHERE categoria_id = ? LIMIT 1',
      [categoriaId]
    );
    
    if (rows.length > 0) {
      return rows[0].id;
    }
    
    // Si no existe subcategoría, crearla
    const [result] = await db.query(
      'INSERT INTO subcategorias (nombre, categoria_id) VALUES (?, ?)',
      ['General', categoriaId]
    );
    console.log(`✨ Subcategoría "General" creada para categoría ${categoriaId}`);
    return result.insertId;
    
  } catch (err) {
    console.error('❌ Error al obtener/crear subcategoría:', err.message);
    throw err;
  }
};

/**
 * Mapear el nombre de categoría de Hostinger a ID de subcategoría local
 */
const mapearCategoriaASubcategoria = async (categoriaNombre) => {
  try {
    // 1. Obtener o crear la categoría
    const categoriaId = await obtenerOCrearCategoria(categoriaNombre);
    
    // 2. Obtener la primera subcategoría (o crearla si no existe)
    const subcategoriaId = await obtenerPrimeraSubcategoria(categoriaId);
    
    return subcategoriaId;
  } catch (err) {
    console.error('❌ Error al mapear categoría:', err.message);
    throw err;
  }
};

/**
 * Obtener preview sin importar
 */
const mostrarPreview = async () => {
  try {
    console.log('\n📋 PREVIEW DE PRODUCTOS HOSTINGER\n');
    console.log('═'.repeat(80));
    
    const [products] = await dbHostinger.query(
      "SELECT * FROM products WHERE deleted_at IS NULL AND category = 'Plaxtilineas' ORDER BY id DESC LIMIT 5"
    );
    
    console.log(`\n📦 Mostrando ${products.length} productos de muestra...\n`);
    
    for (const product of products) {
      const [images] = await dbHostinger.query(
        'SELECT url FROM product_images WHERE product_id = ? LIMIT 1',
        [product.id]
      );
      
      const [variantes] = await dbHostinger.query(
        'SELECT COUNT(*) as total FROM product_variants WHERE product_id = ?',
        [product.id]
      );
      
      console.log(`\n🆔 ID: ${product.id}`);
      console.log(`📝 Nombre: ${product.name}`);
      console.log(`📄 Descripción: ${(product.description || '').substring(0, 60)}...`);
      console.log(`🏷️ Categoría: ${product.category || 'No especificada'}`);
      console.log(`🖼️ Imagen: ${images.length > 0 ? '✅ Sí' : '❌ No'}`);
      console.log(`📦 Variantes: ${variantes[0].total}`);
    }
    
    // Estadísticas generales
    const [totalProductos] = await dbHostinger.query(
      "SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL AND category = 'Plaxtilineas'"
    );
    
    const [productosPorCategoria] = await dbHostinger.query(`
      SELECT category, COUNT(*) as total 
      FROM products 
      WHERE deleted_at IS NULL AND category = 'Plaxtilineas'
      GROUP BY category 
      ORDER BY total DESC
    `);
    
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`\n📊 ESTADÍSTICAS GENERALES\n`);
    console.log(`Total de productos: ${totalProductos[0].total}`);
    console.log(`\nProductos por categoría:`);
    
    for (const cat of productosPorCategoria) {
      console.log(`  • ${cat.category || '(sin categoría)'}: ${cat.total}`);
    }
    
    console.log(`\n${'-'.repeat(80)}`);
    console.log('\n✅ Para importar estos productos, ejecuta:');
    console.log('   node scripts/importarProductosHostinger.js ejecutar\n');
    
  } catch (err) {
    console.error('❌ Error en preview:', err.message);
  } finally {
    process.exit(0);
  }
};

/**
 * Ejecutar importación completa
 */
const ejecutarImportacion = async () => {
  let conexion;
  
  try {
    console.log('\n⚠️  IMPORTANDO PRODUCTOS DESDE HOSTINGER\n');
    console.log('═'.repeat(80));
    console.log('⚠️  Esta operación es irreversible. Presiona Ctrl+C para cancelar...\n');
    
    // Esperar 3 segundos para que el usuario cancele si lo desea
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔄 Iniciando importación...\n');
    
    conexion = await db.getConnection();
    
    const [products] = await dbHostinger.query(
      "SELECT * FROM products WHERE deleted_at IS NULL AND category = 'Plaxtilineas' ORDER BY id DESC"
    );
    
    console.log(`📦 Total de productos a importar: ${products.length}\n`);
    
    let importados = 0;
    let duplicados = 0;
    let errores = [];
    
    // Iniciar transacción
    await conexion.beginTransaction();
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // ✅ VALIDACIÓN: Verificar si el producto ya existe
        const esDuplicado = await verificarProductoDuplicado(product.name || 'Sin nombre');
        
        if (esDuplicado) {
          duplicados++;
          const porcentaje = Math.round((i + 1) / products.length * 100);
          process.stdout.write(`\r⏭️  Procesados: ${i + 1}/${products.length} (${porcentaje}%) | Importados: ${importados} | Duplicados: ${duplicados}`);
          continue; // Saltar este producto
        }
        
        // Obtener primera imagen
        const [images] = await dbHostinger.query(
          'SELECT url FROM product_images WHERE product_id = ? LIMIT 1',
          [product.id]
        );
        
        const imagenUrl = images.length > 0 ? images[0].url : null;
        const subcategoriaId = await mapearCategoriaASubcategoria(product.category);
        
        // Obtener TODAS las variantes (no solo el precio)
        const [variantes] = await dbHostinger.query(
          'SELECT name, price FROM product_variants WHERE product_id = ? AND available = 1 ORDER BY price ASC',
          [product.id]
        );
        
        const precioFinal = variantes.length > 0 && variantes[0].price 
          ? parseFloat(variantes[0].price) 
          : 0;
        
        // Insertar producto
        const [resultProducto] = await conexion.query(
          `INSERT INTO productos 
          (nombre, descripcion, cantidad, precio, imagen_url, subcategoria_id, unidad, creado_en) 
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            product.name || 'Sin nombre',
            product.description || '',
            1,
            precioFinal,
            imagenUrl,
            subcategoriaId,
            'unidad'
          ]
        );
        
        const productoId = resultProducto.insertId;
        
        // Insertar todas las variantes
        for (const variante of variantes) {
          await conexion.query(
            'INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)',
            [productoId, variante.name || 'Variante', parseFloat(variante.price) || 0]
          );
        }
        
        importados++;
        const porcentaje = Math.round((i + 1) / products.length * 100);
        process.stdout.write(`\r✅ Procesados: ${i + 1}/${products.length} (${porcentaje}%) | Importados: ${importados} | Duplicados: ${duplicados} | Variantes: ${variantes.length}`);
        
      } catch (err) {
        errores.push({
          id: product.id,
          nombre: product.name,
          error: err.message
        });
      }
    }
    
    // Confirmar transacción
    await conexion.commit();
    
    console.log('\n\n' + '─'.repeat(80));
    console.log('\n✅ IMPORTACIÓN COMPLETADA\n');
    console.log(`📦 Productos importados exitosamente: ${importados}/${products.length}`);
    console.log(`⏭️  Productos duplicados omitidos: ${duplicados}`);
    
    if (errores.length > 0) {
      console.log(`\n⚠️  Errores en importación: ${errores.length}`);
      errores.slice(0, 5).forEach(e => {
        console.log(`   • ${e.nombre}: ${e.error}`);
      });
      if (errores.length > 5) {
        console.log(`   ... y ${errores.length - 5} más`);
      }
    }
    
    console.log('\n' + '─'.repeat(80) + '\n');
    
  } catch (err) {
    console.error('\n\n❌ Error en importación:', err.message);
    
    // Revertir si hay transacción abierta
    if (conexion) {
      try {
        await conexion.rollback();
        console.log('⏮️  Transacción revertida');
      } catch (rollbackErr) {
        console.error('❌ Error al revertir:', rollbackErr.message);
      }
    }
    
  } finally {
    if (conexion) {
      conexion.release();
    }
    process.exit(0);
  }
};

// Ejecutar según la acción
if (accion === 'preview') {
  mostrarPreview();
} else if (accion === 'ejecutar') {
  ejecutarImportacion();
}
