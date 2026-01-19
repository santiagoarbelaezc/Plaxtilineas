// controllers/producto.controller.js
const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary'); 

// 🔍 Obtener todos los productos
exports.obtenerProductos = async (req, res) => {
  try {
    const { subcategoria_id } = req.query;
    let query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.unidad,
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        COALESCE((
          SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_maximo
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
    `;
    
    const params = [];
    if (subcategoria_id) {
      query += ' WHERE p.subcategoria_id = ?';
      params.push(subcategoria_id);
    }
    
    query += ' ORDER BY p.creado_en DESC';
    
    const [rows] = await db.query(query, params);
    console.log('✅ Productos obtenidos:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos:', err);
    res.status(500).json({ error: 'No se pudieron obtener los productos' });
  }
};

// 🔍 Obtener producto por ID
exports.obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const productoId = parseInt(id, 10);
    if (isNaN(productoId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }
    
    const productoQuery = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.unidad,
        p.public_id,
        p.subcategoria_id,
        p.creado_en,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE p.id = ?
    `;
    
    const [productoRows] = await db.query(productoQuery, [productoId]);
    
    if (productoRows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const producto = productoRows[0];
    
    const variantesQuery = `
      SELECT id, nombre, precio 
      FROM variantes 
      WHERE producto_id = ? 
      ORDER BY precio ASC
    `;
    
    const [variantesRows] = await db.query(variantesQuery, [productoId]);
    
    const respuesta = {
      ...producto,
      variantes: variantesRows,
      tiene_variantes: variantesRows.length > 0
    };
    
    console.log('✅ Producto obtenido por ID:', productoId);
    res.json(respuesta);
  } catch (err) {
    console.error('❌ Error al obtener producto por ID:', err);
    res.status(500).json({ error: 'No se pudo obtener el producto' });
  }
};

// ✅ Crear producto
exports.crearProductoDesdeRuta = async (req, res) => {
  try {
    const nombre = req.body.nombre?.trim() || '';
    const descripcion = req.body.descripcion?.trim() || '';
    const cantidad = req.body.cantidad ? parseInt(req.body.cantidad, 10) : 0;
    const precio = parseFloat(req.body.precio);
    const subcategoria_id = parseInt(req.body.subcategoria_id, 10);
    const unidad = req.body.unidad?.trim() || 'unidad';

    // ✅ Validaciones
    if (!nombre || isNaN(precio) || isNaN(subcategoria_id)) {
      return res.status(400).json({ 
        error: 'Datos inválidos. Verifica los campos del formulario.'
      });
    }

    // 🔧 ACCEDER A LA IMAGEN DESDE EL MIDDLEWARE
    const imagen_url = req.cloudinaryResult?.url || '';
    const public_id = req.cloudinaryResult?.public_id || '';

    console.log('📸 Creando producto:', {
      nombre,
      tiene_imagen: !!imagen_url,
      subcategoria_id,
      unidad
    });

    // Insertar en la base de datos
    const [result] = await db.query(`
      INSERT INTO productos (nombre, descripcion, cantidad, precio, imagen_url, public_id, subcategoria_id, unidad)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [nombre, descripcion, cantidad, precio, imagen_url, public_id, subcategoria_id, unidad]);

    return res.status(201).json({
      mensaje: 'Producto creado con éxito',
      id: result.insertId,
      nombre,
      imagen_url: imagen_url || null
    });
  } catch (err) {
    console.error('❌ Error al crear producto:', err.message);
    return res.status(500).json({ 
      error: 'Error interno al crear el producto',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🔄 Actualizar producto
exports.actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, cantidad, precio, subcategoria_id, unidad } = req.body;
  
  try {
    // Obtener el producto actual
    const [rows] = await db.query('SELECT imagen_url, public_id FROM productos WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const productoActual = rows[0];
    const imagenActual = productoActual.imagen_url;
    const publicIdActual = productoActual.public_id;
    
    // 🔧 ACCEDER A LA NUEVA IMAGEN DESDE EL MIDDLEWARE
    const nuevaImagenUrl = req.cloudinaryResult?.url || null;
    const nuevoPublicId = req.cloudinaryResult?.public_id || null;
    
    console.log('🔄 Actualizando producto ID:', id);
    
    // Si hay nueva imagen y ya había una, eliminar la anterior de Cloudinary
    if (nuevaImagenUrl && publicIdActual) {
      try {
        await cloudinary.uploader.destroy(publicIdActual);
        console.log('🗑️ Imagen anterior eliminada de Cloudinary');
      } catch (cloudinaryError) {
        console.warn('⚠️ No se pudo eliminar imagen anterior');
      }
    }
    
    // Preparar valores para actualización
    const imagenUrlFinal = nuevaImagenUrl || imagenActual;
    const publicIdFinal = nuevoPublicId || publicIdActual;
    const unidadFinal = unidad?.trim() || 'unidad';
    
    // Actualizar producto en la base de datos
    await db.query(
      'UPDATE productos SET nombre = ?, descripcion = ?, cantidad = ?, precio = ?, imagen_url = ?, public_id = ?, subcategoria_id = ?, unidad = ? WHERE id = ?',
      [
        nombre,
        descripcion,
        cantidad,
        precio,
        imagenUrlFinal,
        publicIdFinal,
        subcategoria_id,
        unidadFinal,
        id
      ]
    );
    
    res.json({ 
      mensaje: 'Producto actualizado con éxito',
      imagen_actualizada: !!nuevaImagenUrl
    });
  } catch (err) {
    console.error('❌ Error al actualizar producto:', err.message);
    res.status(500).json({ 
      error: 'No se pudo actualizar el producto',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🗑️ Eliminar producto
exports.eliminarProducto = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Obtener el producto antes de eliminarlo
    const [rows] = await db.query('SELECT public_id FROM productos WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const publicId = rows[0].public_id;

    // 2. Eliminar la imagen de Cloudinary si existe public_id
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log('🗑️ Imagen eliminada de Cloudinary');
      } catch (cloudinaryError) {
        console.warn('⚠️ No se pudo eliminar imagen de Cloudinary');
      }
    }

    // 3. Eliminar el producto de la base de datos
    await db.query('DELETE FROM productos WHERE id = ?', [id]);

    res.json({ 
      mensaje: 'Producto eliminado exitosamente',
      eliminado: true
    });
  } catch (err) {
    console.error('❌ Error al eliminar producto:', err.message);
    res.status(500).json({ 
      error: 'No se pudo eliminar el producto',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🔍 Obtener productos por subcategoría
exports.obtenerProductosPorSubcategoria = async (req, res) => {
  try {
    const { subcategoria_id } = req.params;
    
    const subcatId = parseInt(subcategoria_id, 10);
    if (isNaN(subcatId)) {
      return res.status(400).json({ error: 'ID de subcategoría inválido' });
    }
    
    const query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.unidad,
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE p.subcategoria_id = ?
      ORDER BY p.creado_en DESC
    `;
    
    const [rows] = await db.query(query, [subcatId]);
    
    console.log(`✅ Productos para subcategoría ${subcatId}:`, rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos por subcategoría:', err);
    res.status(500).json({ error: 'No se pudieron obtener los productos' });
  }
};

// 🏷️ Obtener productos por categoría
exports.obtenerProductosPorCategoria = async (req, res) => {
  try {
    const { categoria_id } = req.params;
    
    // Validar que el ID no sea undefined/null
    if (!categoria_id || categoria_id === 'undefined' || categoria_id === 'null') {
      console.error('❌ ID de categoría inválido recibido:', categoria_id);
      return res.status(400).json({ 
        error: 'ID de categoría no válido',
        detalles: 'Se requiere un ID de categoría válido'
      });
    }
    
    const catId = parseInt(categoria_id, 10);
    if (isNaN(catId)) {
      return res.status(400).json({ error: 'ID de categoría inválido. Debe ser un número.' });
    }
    
    console.log('📦 Solicitando productos para categoría ID:', catId);
    
    // Verificar si la categoría existe
    const [categoriaExiste] = await db.query(
      'SELECT id, nombre, icono_url FROM categorias WHERE id = ?',
      [catId]
    );
    
    if (categoriaExiste.length === 0) {
      return res.status(404).json({ 
        error: 'Categoría no encontrada',
        id_solicitado: catId
      });
    }
    
    const query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.unidad,
        p.subcategoria_id,
        p.creado_en,
        s.nombre AS subcategoria,
        c.id AS categoria_id,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono,
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        COALESCE((
          SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_maximo
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE c.id = ?
      ORDER BY p.creado_en DESC, p.nombre ASC
    `;
    
    const [rows] = await db.query(query, [catId]);
    
    console.log(`✅ Productos obtenidos para categoría ${catId}:`, rows.length);
    
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos por categoría:', err.message);
    res.status(500).json({ 
      error: 'No se pudieron obtener los productos de la categoría',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🎲 Obtener productos aleatorios
exports.obtenerProductosAleatorios = async (req, res) => {
  try {
    const { limite = 8 } = req.query;
    
    const limit = parseInt(limite, 10);
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: 'Límite inválido. Debe ser un número positivo.' });
    }
    
    const query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.unidad,
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono,
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        COALESCE((
          SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_maximo
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      ORDER BY RAND()
      LIMIT ?
    `;
    
    const [rows] = await db.query(query, [limit]);
    
    console.log(`✅ Productos aleatorios obtenidos (límite: ${limit}):`, rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos aleatorios:', err);
    res.status(500).json({ error: 'No se pudieron obtener los productos aleatorios' });
  }
};

// 📅 Obtener últimos productos
exports.obtenerUltimosProductos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.unidad,
        p.creado_en,
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono,
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        COALESCE((
          SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_maximo
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE p.creado_en IS NOT NULL
      ORDER BY p.creado_en DESC
      LIMIT 2
    `;
    
    const [rows] = await db.query(query);
    
    console.log(`✅ Últimos productos obtenidos:`, rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener los últimos productos:', err);
    res.status(500).json({ error: 'No se pudieron obtener los últimos productos' });
  }
};

// 🔍 Verificar si un producto tiene variantes
exports.verificarVariantesProducto = async (req, res) => {
  try {
    const { producto_id } = req.params;
    
    const query = `
      SELECT 
        p.id,
        p.nombre,
        COUNT(v.id) AS cantidad_variantes,
        CASE 
          WHEN COUNT(v.id) > 0 THEN TRUE 
          ELSE FALSE 
        END AS tiene_variantes
      FROM productos p
      LEFT JOIN variantes v ON p.id = v.producto_id
      WHERE p.id = ?
      GROUP BY p.id, p.nombre
    `;
    
    const [rows] = await db.query(query, [producto_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error al verificar variantes:', err);
    res.status(500).json({ error: 'No se pudo verificar las variantes' });
  }
};

// 🔎 Buscar productos por nombre (búsqueda simple)
exports.buscarProductosPorNombre = async (req, res) => {
  try {
    const { nombre } = req.query;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ 
        error: 'Debe proporcionar un término de búsqueda' 
      });
    }
    
    const terminoBusqueda = `%${nombre.trim()}%`;
    
    const query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.subcategoria_id,
        p.creado_en,
        s.nombre AS subcategoria,
        c.id AS categoria_id,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono,
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        COALESCE((
          SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_maximo
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE p.nombre LIKE ? OR p.descripcion LIKE ?
      ORDER BY 
        CASE 
          WHEN p.nombre LIKE ? THEN 1
          ELSE 2
        END,
        p.nombre ASC
    `;
    
    const [rows] = await db.query(query, [
      terminoBusqueda,
      terminoBusqueda,
      `%${nombre.trim()}%`
    ]);
    
    console.log(`🔍 Búsqueda: "${nombre}" - Resultados: ${rows.length}`);
    
    if (rows.length === 0) {
      return res.json({
        resultados: [],
        total: 0,
        termino_buscado: nombre,
        mensaje: `No se encontraron productos para "${nombre}"`
      });
    }
    
    res.json({
      resultados: rows,
      total: rows.length,
      termino_buscado: nombre
    });
    
  } catch (err) {
    console.error('❌ Error al buscar productos por nombre:', err.message);
    res.status(500).json({ 
      error: 'Error al buscar productos',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🔄 NUEVO: Obtener productos relacionados (misma subcategoría, excluyendo producto actual)
exports.obtenerProductosRelacionados = async (req, res) => {
  try {
    const { producto_id, limite = 4 } = req.query;
    
    if (!producto_id) {
      return res.status(400).json({ 
        error: 'Se requiere el ID del producto actual' 
      });
    }
    
    const prodId = parseInt(producto_id, 10);
    const limit = parseInt(limite, 10);
    
    if (isNaN(prodId) || isNaN(limit) || limit <= 0) {
      return res.status(400).json({ 
        error: 'Parámetros inválidos' 
      });
    }
    
    // 1. Obtener la subcategoría del producto actual
    const [productoActual] = await db.query(
      'SELECT subcategoria_id FROM productos WHERE id = ?',
      [prodId]
    );
    
    if (productoActual.length === 0) {
      return res.status(404).json({ 
        error: 'Producto no encontrado' 
      });
    }
    
    const subcategoriaId = productoActual[0].subcategoria_id;
    
    // 2. Obtener productos de la misma subcategoría, excluyendo el producto actual
    const query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono,
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        COALESCE((
          SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_maximo
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE p.subcategoria_id = ? AND p.id != ?
      ORDER BY RAND()
      LIMIT ?
    `;
    
    const [rows] = await db.query(query, [subcategoriaId, prodId, limit]);
    
    console.log(`🔄 Productos relacionados para producto ${prodId}:`, rows.length);
    res.json(rows);
    
  } catch (err) {
    console.error('❌ Error al obtener productos relacionados:', err.message);
    res.status(500).json({ 
      error: 'No se pudieron obtener los productos relacionados',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 📊 NUEVO: Búsqueda avanzada con filtros
exports.busquedaAvanzada = async (req, res) => {
  try {
    const { 
      nombre, 
      categoria_id, 
      precio_min, 
      precio_max, 
      orden = 'relevancia', 
      limite = 20 
    } = req.query;
    
    // Construir la consulta base
    let query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
        p.subcategoria_id,
        p.creado_en,
        s.nombre AS subcategoria,
        c.id AS categoria_id,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono,
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        COALESCE((
          SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_maximo
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Aplicar filtros
    if (nombre && nombre.trim() !== '') {
      query += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
      const termino = `%${nombre.trim()}%`;
      params.push(termino, termino);
    }
    
    if (categoria_id && !isNaN(parseInt(categoria_id, 10))) {
      query += ' AND c.id = ?';
      params.push(parseInt(categoria_id, 10));
    }
    
    if (precio_min && !isNaN(parseFloat(precio_min))) {
      query += ' AND p.precio >= ?';
      params.push(parseFloat(precio_min));
    }
    
    if (precio_max && !isNaN(parseFloat(precio_max))) {
      query += ' AND p.precio <= ?';
      params.push(parseFloat(precio_max));
    }
    
    // Aplicar orden
    switch (orden) {
      case 'precio_asc':
        query += ' ORDER BY p.precio ASC';
        break;
      case 'precio_desc':
        query += ' ORDER BY p.precio DESC';
        break;
      case 'nombre':
        query += ' ORDER BY p.nombre ASC';
        break;
      case 'relevancia':
      default:
        if (nombre && nombre.trim() !== '') {
          query += ' ORDER BY CASE WHEN p.nombre LIKE ? THEN 1 ELSE 2 END, p.nombre ASC';
          params.push(`%${nombre.trim()}%`);
        } else {
          query += ' ORDER BY p.creado_en DESC';
        }
        break;
    }
    
    // Aplicar límite
    if (limite && !isNaN(parseInt(limite, 10))) {
      query += ' LIMIT ?';
      params.push(parseInt(limite, 10));
    }
    
    const [rows] = await db.query(query, params);
    
    console.log(`📊 Búsqueda avanzada - Resultados: ${rows.length}`);
    
    res.json(rows);
    
  } catch (err) {
    console.error('❌ Error en búsqueda avanzada:', err.message);
    res.status(500).json({ 
      error: 'Error en la búsqueda avanzada',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 📊 NUEVO: Obtener estadísticas de productos
exports.obtenerEstadisticasProductos = async (req, res) => {
  try {
    const [totalProductos] = await db.query('SELECT COUNT(*) as total FROM productos');
    const [productosPorCategoria] = await db.query(`
      SELECT 
        c.nombre as categoria,
        COUNT(p.id) as total_productos
      FROM categorias c
      LEFT JOIN subcategorias s ON c.id = s.categoria_id
      LEFT JOIN productos p ON s.id = p.subcategoria_id
      GROUP BY c.id, c.nombre
      ORDER BY total_productos DESC
    `);
    
    const [productosConVariantes] = await db.query(`
      SELECT COUNT(*) as total FROM productos p
      WHERE EXISTS (SELECT 1 FROM variantes v WHERE v.producto_id = p.id)
    `);
    
    const [productosSinStock] = await db.query(`
      SELECT COUNT(*) as total FROM productos WHERE cantidad <= 0
    `);
    
    res.json({
      total_productos: totalProductos[0].total,
      productos_por_categoria: productosPorCategoria,
      productos_con_variantes: productosConVariantes[0].total,
      productos_sin_stock: productosSinStock[0].total,
      fecha_consulta: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Error al obtener estadísticas:', err.message);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};