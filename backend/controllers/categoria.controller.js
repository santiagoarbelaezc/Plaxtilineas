const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary'); 

// 🔍 Obtener todas las categorías
exports.obtenerCategorias = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categorias');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener categorías:', err);
    res.status(500).json({ error: 'No se pudieron obtener las categorías' });
  }
};

// ✅ Crear categoría sin ícono
exports.crearCategoria = async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const [result] = await db.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ mensaje: 'Categoría creada con éxito', id: result.insertId });
  } catch (err) {
    console.error('❌ Error al crear categoría:', err);
    res.status(500).json({ error: 'No se pudo crear la categoría' });
  }
};

// ✅ Crear categoría con ícono (Cloudinary)
exports.crearCategoriaConIcono = async (req, res) => {
  const { nombre } = req.body;
  const icono_url = req.file?.path || null;
  const icono_public_id = req.file?.filename || null;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO categorias (nombre, icono_url, icono_public_id) VALUES (?, ?, ?)',
      [nombre, icono_url, icono_public_id]
    );

    res.status(201).json({
      mensaje: 'Categoría creada con icono con éxito',
      id: result.insertId,
      icono_url
    });
  } catch (err) {
    console.error('❌ Error al crear categoría con icono:', err);
    res.status(500).json({ error: 'No se pudo crear la categoría' });
  }
};

// 📝 Actualizar nombre e ícono (opcional)
exports.actualizarCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  const nuevoIcono = req.file?.path;
  const nuevoPublicId = req.file?.filename;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    // Obtener el public_id anterior
    const [rows] = await db.query('SELECT icono_public_id FROM categorias WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Categoría no encontrada' });

    const oldPublicId = rows[0].icono_public_id;

    // Si hay nuevo ícono, elimina el anterior
    if (nuevoIcono && oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId);
    }

    // Armar query dinámica
    let query = 'UPDATE categorias SET nombre = ?';
    const values = [nombre];

    if (nuevoIcono) {
      query += ', icono_url = ?, icono_public_id = ?';
      values.push(nuevoIcono, nuevoPublicId);
    }

    query += ' WHERE id = ?';
    values.push(id);

    await db.query(query, values);

    res.json({ mensaje: '✅ Categoría actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar categoría:', err);
    res.status(500).json({ error: 'No se pudo actualizar la categoría' });
  }
};

// 🗑️ Eliminar categoría (NO elimina imagen aún)
exports.eliminarCategoria = async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener el public_id para eliminar imagen
    const [rows] = await db.query('SELECT icono_public_id FROM categorias WHERE id = ?', [id]);
    const iconoPublicId = rows[0]?.icono_public_id;

    if (iconoPublicId) {
      await cloudinary.uploader.destroy(iconoPublicId);
    }

    await db.query('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (err) {
    console.error('❌ Error al eliminar categoría:', err);
    res.status(500).json({ error: 'No se pudo eliminar la categoría' });
  }
};

//Funcion para crear el arbol del menu principal de forma dinamica
exports.obtenerCategoriasConSubcategorias = async (req, res) => {
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

  try {
    const [results] = await db.query(sql); // 👈 importante el [results]

    const categorias = {};

    results.forEach(row => {
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

    res.json(Object.values(categorias));
  } catch (err) {
    console.error('❌ Error en consulta:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};