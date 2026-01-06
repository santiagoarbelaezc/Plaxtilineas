// controllers/categoria.controller.js
const db = require('../config/db');

// 🔍 Obtener todas las categorías (simple y directo)
exports.obtenerCategorias = async (req, res) => {
  try {
    console.log('📋 [CATEGORIAS] Solicitando todas las categorías...');
    const [rows] = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
    console.log(`✅ [CATEGORIAS] Encontradas ${rows.length} categorías`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener categorías:', err);
    res.status(500).json({ 
      error: 'No se pudieron obtener las categorías',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🌳 Obtener categorías con subcategorías (MANTENIENDO estructura original)
exports.obtenerCategoriasConSubcategorias = async (req, res) => {
  try {
    console.log('🌳 [CATEGORIAS] Solicitando categorías con subcategorías...');
    
    const sql = `
      SELECT 
        c.id AS categoria_id,
        c.nombre AS categoria_nombre,
        c.icono_url,
        s.id AS subcategoria_id,
        s.nombre AS subcategoria_nombre,
        COUNT(p.id) AS cantidad_productos
      FROM categorias c
      LEFT JOIN subcategorias s ON s.categoria_id = c.id
      LEFT JOIN productos p ON p.subcategoria_id = s.id
      GROUP BY c.id, s.id
      ORDER BY c.nombre, s.nombre;
    `;

    const [results] = await db.query(sql);
    const categorias = {};

    // Procesar resultados MANTENIENDO la estructura ORIGINAL
    results.forEach(row => {
      // Solo procesar si hay subcategoría
      if (!row.subcategoria_id) return;

      if (!categorias[row.categoria_id]) {
        categorias[row.categoria_id] = {
          id: row.categoria_id,
          nombre: row.categoria_nombre,
          icono_url: row.icono_url,
          subcategorias: []
        };
      }

      categorias[row.categoria_id].subcategorias.push({
        id: row.subcategoria_id,
        nombre: row.subcategoria_nombre,
        cantidad: row.cantidad_productos
      });
    });

    const categoriasArray = Object.values(categorias);
    console.log(`✅ [CATEGORIAS] Devueltas ${categoriasArray.length} categorías con subcategorías`);
    
    // DEVUELVE SOLO EL ARRAY, no un objeto con metadatos
    res.json(categoriasArray);
    
  } catch (err) {
    console.error('❌ Error al obtener categorías con subcategorías:', err.message);
    res.status(500).json({ 
      error: 'Error al obtener la estructura de categorías',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Crear categoría con ícono (usando middleware nuevo)
exports.crearCategoriaConIcono = async (req, res) => {
  const { nombre } = req.body;
  
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ 
      error: 'El nombre es obligatorio',
      detalles: 'Proporcione un nombre válido para la categoría'
    });
  }

  try {
    // Acceder al resultado de Cloudinary desde el middleware
    if (!req.cloudinaryResult?.url) {
      return res.status(400).json({ 
        error: 'No se recibió ningún archivo de imagen válido',
        detalles: 'Asegúrese de seleccionar un archivo de imagen (JPEG, PNG, JPG, WEBP)'
      });
    }

    const icono_url = req.cloudinaryResult.url;
    const icono_public_id = req.cloudinaryResult.public_id;
    const nombreCategoria = nombre.trim();

    console.log('📸 Creando categoría con ícono:', nombreCategoria);

    // Verificar si la categoría ya existe
    const [categoriasExistentes] = await db.query(
      'SELECT id, nombre FROM categorias WHERE nombre = ?',
      [nombreCategoria]
    );
    
    if (categoriasExistentes.length > 0) {
      // Si ya existe la categoría, eliminar la imagen recién subida de Cloudinary
      if (icono_public_id) {
        try {
          const { cloudinary } = require('../config/cloudinary');
          await cloudinary.uploader.destroy(icono_public_id);
        } catch (cloudinaryError) {
          console.warn('⚠️ No se pudo eliminar imagen duplicada');
        }
      }
      
      return res.status(409).json({ 
        error: 'La categoría ya existe',
        categoria_existente: categoriasExistentes[0]
      });
    }

    // Insertar en la base de datos
    const [result] = await db.query(
      'INSERT INTO categorias (nombre, icono_url, icono_public_id) VALUES (?, ?, ?)',
      [nombreCategoria, icono_url, icono_public_id]
    );

    res.status(201).json({
      mensaje: '✅ Categoría creada con ícono con éxito',
      id: result.insertId,
      nombre: nombreCategoria,
      icono_url
    });
  } catch (err) {
    console.error('❌ Error al crear categoría con icono:', err.message);
    res.status(500).json({ 
      error: 'No se pudo crear la categoría con icono',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 📝 Actualizar categoría
exports.actualizarCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ 
      error: 'El nombre es obligatorio',
      detalles: 'Proporcione un nombre válido para la categoría'
    });
  }

  try {
    // Verificar que la categoría existe
    const [categoriaActual] = await db.query(
      'SELECT id, nombre, icono_url, icono_public_id FROM categorias WHERE id = ?',
      [id]
    );
    
    if (categoriaActual.length === 0) {
      return res.status(404).json({ 
        error: 'Categoría no encontrada',
        id_solicitado: id
      });
    }

    const categoria = categoriaActual[0];
    const nombreActual = categoria.nombre;
    const nombreNuevo = nombre.trim();
    const iconoPublicIdActual = categoria.icono_public_id;
    
    // Obtener nuevo ícono si se subió uno
    const nuevoIconoUrl = req.cloudinaryResult?.url || null;
    const nuevoIconoPublicId = req.cloudinaryResult?.public_id || null;
    
    console.log('🔄 Actualizando categoría:', { id, nombreActual, nombreNuevo });

    // Si hay nuevo ícono y ya había uno, eliminar el anterior de Cloudinary
    if (nuevoIconoUrl && iconoPublicIdActual) {
      try {
        const { cloudinary } = require('../config/cloudinary');
        await cloudinary.uploader.destroy(iconoPublicIdActual);
      } catch (cloudinaryError) {
        console.warn('⚠️ No se pudo eliminar ícono anterior');
      }
    }

    // Verificar si el nuevo nombre ya existe en otra categoría
    if (nombreNuevo !== nombreActual) {
      const [categoriasConMismoNombre] = await db.query(
        'SELECT id, nombre FROM categorias WHERE nombre = ? AND id != ?',
        [nombreNuevo, id]
      );
      
      if (categoriasConMismoNombre.length > 0) {
        // Si hay conflicto de nombre y subimos un nuevo ícono, limpiarlo
        if (nuevoIconoUrl && nuevoIconoPublicId) {
          try {
            const { cloudinary } = require('../config/cloudinary');
            await cloudinary.uploader.destroy(nuevoIconoPublicId);
          } catch (cleanupError) {
            console.warn('⚠️ Error limpiando ícono subido');
          }
        }
        
        return res.status(409).json({ 
          error: 'Ya existe otra categoría con ese nombre',
          categoria_existente: categoriasConMismoNombre[0]
        });
      }
    }

    // Preparar valores para actualización
    const iconoUrlFinal = nuevoIconoUrl || categoria.icono_url;
    const iconoPublicIdFinal = nuevoIconoPublicId || iconoPublicIdActual;
    
    // Actualizar categoría en la base de datos
    await db.query(
      'UPDATE categorias SET nombre = ?, icono_url = ?, icono_public_id = ? WHERE id = ?',
      [nombreNuevo, iconoUrlFinal, iconoPublicIdFinal, id]
    );

    res.json({ 
      mensaje: '✅ Categoría actualizada correctamente',
      categoria: {
        id,
        nombre: nombreNuevo,
        icono_url: iconoUrlFinal,
        icono_public_id: iconoPublicIdFinal
      }
    });
  } catch (err) {
    console.error('❌ Error al actualizar categoría:', err.message);
    res.status(500).json({ 
      error: 'No se pudo actualizar la categoría',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🗑️ Eliminar categoría
exports.eliminarCategoria = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Verificar que la categoría existe
    const [categoria] = await db.query(
      'SELECT id, nombre, icono_public_id FROM categorias WHERE id = ?',
      [id]
    );

    if (categoria.length === 0) {
      return res.status(404).json({ 
        error: 'Categoría no encontrada',
        id_solicitado: id
      });
    }

    const nombreCategoria = categoria[0].nombre;
    const iconoPublicId = categoria[0].icono_public_id;

    // 2. Verificar si hay subcategorías asociadas
    const [subcategorias] = await db.query(
      'SELECT COUNT(*) as total FROM subcategorias WHERE categoria_id = ?',
      [id]
    );

    if (subcategorias[0].total > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar la categoría',
        detalles: `La categoría "${nombreCategoria}" tiene ${subcategorias[0].total} subcategoría(s) asociada(s). Elimine primero las subcategorías.`
      });
    }

    // 3. Eliminar el ícono de Cloudinary si existe
    if (iconoPublicId) {
      try {
        const { cloudinary } = require('../config/cloudinary');
        await cloudinary.uploader.destroy(iconoPublicId);
      } catch (cloudinaryError) {
        console.warn('⚠️ No se pudo eliminar ícono de Cloudinary');
      }
    }

    // 4. Eliminar la categoría de la base de datos
    await db.query('DELETE FROM categorias WHERE id = ?', [id]);

    res.json({ 
      mensaje: '✅ Categoría eliminada correctamente',
      eliminado: true
    });
  } catch (err) {
    console.error('❌ Error al eliminar categoría:', err.message);
    res.status(500).json({ 
      error: 'No se pudo eliminar la categoría',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🔍 Obtener ID de categoría por nombre
exports.obtenerIdCategoriaPorNombre = async (req, res) => {
  const { nombre } = req.params;
  
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ 
      error: 'El nombre es obligatorio',
      detalles: 'Proporcione el nombre de la categoría'
    });
  }

  try {
    const nombreBuscado = nombre.trim();
    const [rows] = await db.query(
      'SELECT id, nombre, icono_url FROM categorias WHERE nombre = ?',
      [nombreBuscado]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Categoría no encontrada',
        nombre_buscado: nombreBuscado
      });
    }
    
    res.json({ 
      success: true,
      categoria: rows[0]
    });
  } catch (err) {
    console.error('❌ Error al buscar categoría por nombre:', err.message);
    res.status(500).json({ 
      error: 'Error al buscar la categoría',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Crear categoría sin ícono (Opcional)
exports.crearCategoria = async (req, res) => {
  const { nombre } = req.body;
  
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ 
      error: 'El nombre es obligatorio',
      detalles: 'Proporcione un nombre válido para la categoría'
    });
  }

  try {
    const nombreCategoria = nombre.trim();

    // Verificar si la categoría ya existe
    const [categoriasExistentes] = await db.query(
      'SELECT id, nombre FROM categorias WHERE nombre = ?',
      [nombreCategoria]
    );
    
    if (categoriasExistentes.length > 0) {
      return res.status(409).json({ 
        error: 'La categoría ya existe',
        categoria_existente: categoriasExistentes[0]
      });
    }

    const [result] = await db.query(
      'INSERT INTO categorias (nombre) VALUES (?)', 
      [nombreCategoria]
    );
    
    res.status(201).json({
      mensaje: '✅ Categoría creada con éxito',
      id: result.insertId,
      nombre: nombreCategoria
    });
  } catch (err) {
    console.error('❌ Error al crear categoría:', err.message);
    res.status(500).json({ 
      error: 'No se pudo crear la categoría',
      detalles: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};