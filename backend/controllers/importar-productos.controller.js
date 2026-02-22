// controllers/importar-productos.controller.js
/**
 * Controller para importar productos desde la BD Hostinger
 * Mapea los datos de la estructura antigua a la nueva estructura
 */

const dbLocal = require('../config/db');
const dbHostinger = require('../config/db-hostinger');

/**
 * Obtener o crear categoría por nombre
 */
const obtenerOCrearCategoria = async (categoriaNombre) => {
  try {
    if (!categoriaNombre) {
      // Si no tiene nombre, usar "Plaxtilineas"
      const [rows] = await dbLocal.query(
        'SELECT id FROM categorias WHERE nombre = ? LIMIT 1',
        ['Plaxtilineas']
      );
      if (rows.length > 0) {
        return rows[0].id;
      }
      
      // Crear categoría por defecto
      const [result] = await dbLocal.query(
        'INSERT INTO categorias (nombre) VALUES (?)',
        ['Plaxtilineas']
      );
      console.log('✨ Categoría "Plaxtilineas" creada');
      return result.insertId;
    }
    
    // Buscar categoría existente
    const [rows] = await dbLocal.query(
      'SELECT id FROM categorias WHERE nombre = ? LIMIT 1',
      [categoriaNombre]
    );
    
    if (rows.length > 0) {
      return rows[0].id;
    }
    
    // Si no existe, crearla
    const [result] = await dbLocal.query(
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
    const [rows] = await dbLocal.query(
      'SELECT id FROM subcategorias WHERE categoria_id = ? LIMIT 1',
      [categoriaId]
    );
    
    if (rows.length > 0) {
      return rows[0].id;
    }
    
    // Si no existe subcategoría, crearla
    const [result] = await dbLocal.query(
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
 * Esta función puede ser personalizada según tu mapeo de categorías
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
 * verificar si un producto ya existe en la BD local
 */
const verificarProductoDuplicado = async (nombre) => {
  try {
    const [rows] = await dbLocal.query(
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
 * Obtener todos los productos de Hostinger y mapearlos
 */
exports.importarProductosHostinger = async (req, res) => {
  const conexionLocal = await dbLocal.getConnection();
  
  try {
    console.log('🔄 Iniciando importación de productos desde Hostinger...');
    
    // Obtener solo productos de la categoría Plaxtilineas de Hostinger
    const [products] = await dbHostinger.query(
      "SELECT * FROM products WHERE deleted_at IS NULL AND category = 'Plaxtilineas' ORDER BY id DESC"
    );
    
    console.log(`📦 ${products.length} productos encontrados en Hostinger`);
    
    let productosImportados = 0;
    let productosDuplicados = [];
    let errores = [];
    
    // Comenzar transacción
    await conexionLocal.beginTransaction();
    
    for (const product of products) {
      try {
        // 0. VALIDAR: Verificar si el producto ya existe
        const esDuplicado = await verificarProductoDuplicado(product.name || 'Sin nombre');
        
        if (esDuplicado) {
          console.log(`⏭️ Producto duplicado, omitido: "${product.name}"`);
          productosDuplicados.push({
            producto_id_hostinger: product.id,
            nombre: product.name
          });
          continue; // Pasar al siguiente producto
        }
        
        // 1. Obtener la primera imagen
        const [images] = await dbHostinger.query(
          'SELECT url FROM product_images WHERE product_id = ? LIMIT 1',
          [product.id]
        );
        
        const imagenUrl = images.length > 0 ? images[0].url : null;
        
        // 2. Mapear la categoría a subcategoría local (crea si no existe)
        const subcategoriaId = await mapearCategoriaASubcategoria(product.category);
        
        // 3. Obtener TODAS las variantes
        const [variantes] = await dbHostinger.query(
          'SELECT name, price FROM product_variants WHERE product_id = ? AND available = 1 ORDER BY price ASC',
          [product.id]
        );
        
        // Usar el primer precio de variante o 0
        const precioFinal = variantes.length > 0 && variantes[0].price 
          ? parseFloat(variantes[0].price) 
          : 0;
        
        // 4. Insertar el producto en la base de datos local
        const [resultProducto] = await conexionLocal.query(
          `INSERT INTO productos 
          (nombre, descripcion, cantidad, precio, imagen_url, subcategoria_id, unidad, creado_en) 
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            product.name || 'Sin nombre',
            product.description || '',
            1, // cantidad predeterminada
            precioFinal,
            imagenUrl,
            subcategoriaId,
            'unidad'
          ]
        );
        
        const productoId = resultProducto.insertId;
        
        // 5. Insertar todas las variantes
        for (const variante of variantes) {
          await conexionLocal.query(
            'INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)',
            [productoId, variante.name || 'Variante', parseFloat(variante.price) || 0]
          );
        }
        
        productosImportados++;
        console.log(`✅ Producto importado: "${product.name}" (${variantes.length} variantes)`);
        
      } catch (err) {
        console.error(`❌ Error al importar producto ${product.id}:`, err.message);
        errores.push({
          producto_id: product.id,
          nombre: product.name,
          error: err.message
        });
      }
    }
    
    // Confirmar transacción
    await conexionLocal.commit();
    
    res.json({
      mensaje: 'Importación completada',
      total_procesados: products.length,
      importados_exitosamente: productosImportados,
      duplicados_ignorados: productosDuplicados.length,
      errores: errores.length,
      detalles_duplicados: productosDuplicados.length > 0 ? productosDuplicados : undefined,
      detalles_errores: errores.length > 0 ? errores : undefined
    });
    
  } catch (err) {
    console.error('❌ Error en importación:', err.message);
    
    // Revertir transacción en caso de error
    try {
      await conexionLocal.rollback();
    } catch (rollbackErr) {
      console.error('❌ Error al revertir transacción:', rollbackErr.message);
    }
    
    res.status(500).json({
      error: 'Error durante la importación de productos',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
    
  } finally {
    conexionLocal.release();
  }
};

/**
 * Obtener estadísticas de productos en Hostinger (sin importar)
 */
exports.obtenerEstadisticasHostinger = async (req, res) => {
  try {
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
    
    const [productosConImagen] = await dbHostinger.query(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.deleted_at IS NULL AND p.category = 'Plaxtilineas' AND pi.id IS NOT NULL
    `);
    
    const [productosConVariantes] = await dbHostinger.query(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.deleted_at IS NULL AND p.category = 'Plaxtilineas' AND pv.id IS NOT NULL
    `);
    
    res.json({
      total_productos: totalProductos[0].total,
      productos_por_categoria: productosPorCategoria,
      productos_con_imagen: productosConImagen[0].total,
      productos_con_variantes: productosConVariantes[0].total,
      fecha_consulta: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Error al obtener estadísticas de Hostinger:', err.message);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Preview: Obtener algunos productos de Hostinger SIN importarlos
 * Útil para revisar antes de hacer la importación completa
 */
exports.previewProductosHostinger = async (req, res) => {
  try {
    const { limite = 5 } = req.query;
    const limit = Math.min(parseInt(limite, 10) || 5, 20);
    
    const [products] = await dbHostinger.query(
      `SELECT * FROM products WHERE deleted_at IS NULL AND category = 'Plaxtilineas' ORDER BY id DESC LIMIT ${limit}`
    );
    
    // Enriquecer con imágenes para preview
    const productosPreview = await Promise.all(products.map(async (product) => {
      const [images] = await dbHostinger.query(
        'SELECT url FROM product_images WHERE product_id = ? LIMIT 1',
        [product.id]
      );
      
      const [variantes] = await dbHostinger.query(
        'SELECT * FROM product_variants WHERE product_id = ?',
        [product.id]
      );
      
      return {
        ...product,
        primera_imagen: images.length > 0 ? images[0].url : null,
        variantes_count: variantes.length,
        primer_precio: variantes.length > 0 ? variantes[0].price : null
      };
    }));
    
    res.json({
      total_en_preview: productosPreview.length,
      productos: productosPreview
    });
    
  } catch (err) {
    console.error('❌ Error en preview:', err.message);
    res.status(500).json({
      error: 'Error al obtener preview de productos',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
