const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary'); 

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
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        -- Subconsulta para verificar si tiene variantes
        EXISTS (
          SELECT 1 FROM variantes v WHERE v.producto_id = p.id
        ) AS tiene_variantes,
        -- Obtener el precio mínimo de las variantes (si existen)
        COALESCE((
          SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id
        ), p.precio) AS precio_minimo,
        -- Obtener el precio máximo de las variantes (si existen)
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
    console.log('🧪 Productos desde MySQL:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos:', err);
    res.status(500).json({ error: 'No se pudieron obtener los productos' });
  }
};

exports.obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const productoId = parseInt(id, 10);
    if (isNaN(productoId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }
    
    // Consulta para obtener el producto principal
    const productoQuery = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.cantidad, 
        p.precio, 
        p.imagen_url,
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
    
    // Consulta para obtener las variantes (si existen)
    const variantesQuery = `
      SELECT id, nombre, precio 
      FROM variantes 
      WHERE producto_id = ? 
      ORDER BY precio ASC
    `;
    
    const [variantesRows] = await db.query(variantesQuery, [productoId]);
    
    // Estructura de respuesta
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

exports.crearProductoDesdeRuta = async (req, res) => {
  try {
    const nombre = req.body.nombre?.trim() || '';
    const descripcion = req.body.descripcion?.trim() || '';
    const cantidad = parseInt(req.body.cantidad, 10);
    const precio = parseFloat(req.body.precio);
    const subcategoria_id = parseInt(req.body.subcategoria_id, 10);

    // ✅ Validaciones mínimas
    if (!nombre || isNaN(precio) || isNaN(cantidad) || isNaN(subcategoria_id)) {
      return res.status(400).json({ error: 'Datos inválidos. Verifica los campos del formulario.' });
    }

    const imagen_url = req.file?.path || '';
    const public_id = req.file?.filename ? `plaxtilineas_productos/${req.file.filename}` : '';

    await db.query(`
      INSERT INTO productos (nombre, descripcion, cantidad, precio, imagen_url, public_id, subcategoria_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [nombre, descripcion, cantidad, precio, imagen_url, public_id, subcategoria_id]);

    return res.status(201).json({
      mensaje: 'Producto con imagen creado con éxito',
      imagen_url,
      public_id
    });
  } catch (err) {
    console.error('❌ Error interno en crearProductoDesdeRuta:', err);
    return res.status(500).json({ error: 'Error interno al crear el producto' });
  }
};

exports.actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, cantidad, precio, subcategoria_id } = req.body;
  const nuevaImagen = req.file?.path;
  const nuevoPublicId = req.file?.filename ? `plaxtilineas_productos/${req.file.filename}` : null;

  try {
    // Obtener el public_id actual desde la base de datos
    const [rows] = await db.query('SELECT imagen_url, public_id FROM productos WHERE id = ?', [id]);
    const imagenActual = rows[0]?.imagen_url;
    const publicIdActual = rows[0]?.public_id;

    // Si hay nueva imagen y ya había una, eliminar la anterior
    if (nuevaImagen && publicIdActual) {
      await cloudinary.uploader.destroy(publicIdActual);
    }

    // Actualizar producto con nueva imagen/public_id si existen, si no mantener anteriores
    await db.query(
      'UPDATE productos SET nombre = ?, descripcion = ?, cantidad = ?, precio = ?, imagen_url = ?, public_id = ?, subcategoria_id = ? WHERE id = ?',
      [
        nombre,
        descripcion,
        cantidad,
        precio,
        nuevaImagen || imagenActual,
        nuevoPublicId || publicIdActual,
        subcategoria_id,
        id
      ]
    );
    res.json({ mensaje: 'Producto actualizado con éxito' });
  } catch (err) {
    console.error('❌ Error al actualizar producto:', err);
    res.status(500).json({ error: 'No se pudo actualizar el producto' });
  }
};

exports.eliminarProducto = async (req, res) => {
  const { id } = req.params;
  try {
    // 🔍 1. Obtener el public_id del producto antes de eliminarlo
    const [rows] = await db.query('SELECT public_id FROM productos WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const publicId = rows[0].public_id;

    // 🗑️ 2. Eliminar la imagen de Cloudinary si existe public_id
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    // 💥 3. IMPORTANTE: Las variantes se eliminarán automáticamente
    // debido al ON DELETE CASCADE en la foreign key
    // 🗃️ 4. Eliminar el producto de la base de datos
    await db.query('DELETE FROM productos WHERE id = ?', [id]);

    res.json({ 
      mensaje: 'Producto eliminado exitosamente. Las variantes asociadas también fueron eliminadas.',
      eliminado: true 
    });
  } catch (err) {
    console.error('❌ Error al eliminar producto:', err);
    res.status(500).json({ error: 'No se pudo eliminar el producto' });
  }
};

// Obtener productos por subcategoría (todos los productos de una subcategoría específica)
exports.obtenerProductosPorSubcategoria = async (req, res) => {
  try {
    const { subcategoria_id } = req.params;
    
    // Validar que el subcategoria_id sea un número
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
    
    console.log(`✅ Productos obtenidos para subcategoría ${subcatId}:`, rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos por subcategoría:', err);
    res.status(500).json({ error: 'No se pudieron obtener los productos' });
  }
};
// Obtener productos aleatorios (productos de interés) - TODOS los productos
exports.obtenerProductosAleatorios = async (req, res) => {
  try {
    const { limite = 8 } = req.query;
    
    // Convertir límite a número
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
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      ORDER BY RAND()  -- Orden aleatorio
      LIMIT ?
    `;
    
    const [rows] = await db.query(query, [limit]);
    
    console.log(`✅ ${rows.length} productos aleatorios obtenidos (solicitados: ${limit})`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos aleatorios:', err);
    res.status(500).json({ error: 'No se pudieron obtener los productos aleatorios' });
  }
};

// Obtener los dos últimos productos creados (novedades o más recientes)
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
        p.creado_en,
        p.subcategoria_id,
        s.nombre AS subcategoria,
        c.nombre AS categoria,
        c.icono_url AS categoria_icono
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
      WHERE p.creado_en IS NOT NULL  -- Solo productos con fecha de creación
      ORDER BY p.creado_en DESC      -- Ordenar del más reciente al más antiguo
      LIMIT 2                        -- Limitar a 2 productos
    `;
    
    const [rows] = await db.query(query);
    
    console.log(`✅ Últimos 2 productos obtenidos:`, rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener los últimos productos:', err);
    res.status(500).json({ error: 'No se pudieron obtener los últimos productos' });
  }
};


// Verificar si un producto tiene variantes
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