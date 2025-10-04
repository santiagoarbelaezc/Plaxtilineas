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
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const [result] = await db.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
    res.status(201).json({
      mensaje: 'Categoría creada con éxito',
      id: result.insertId
    });
  } catch (err) {
    console.error('❌ Error al crear categoría:', err.message);
    console.dir(err, { depth: null });
    res.status(500).json({ error: err.message || 'No se pudo crear la categoría' });
  }
};

// ✅ Crear categoría con ícono (Cloudinary)
exports.crearCategoriaConIcono = async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: 'No se recibió ningún archivo de imagen' });
    }

    // 📤 Subir imagen a la carpeta "plaxtilineas_categoria"
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: 'plaxtilineas_categoria',
      public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`,
    });

    const icono_url = uploadResult.secure_url;
    const icono_public_id = uploadResult.public_id;

    const [result] = await db.query(
      'INSERT INTO categorias (nombre, icono_url, icono_public_id) VALUES (?, ?, ?)',
      [nombre, icono_url, icono_public_id]
    );

    res.status(201).json({
      mensaje: 'Categoría creada con ícono con éxito',
      id: result.insertId,
      icono_url
    });
  } catch (err) {
    console.error('❌ Error al crear categoría con icono:', err.message);
    console.dir(err, { depth: null });
    res.status(500).json({ error: err.message || 'No se pudo crear la categoría con icono' });
  }
};

// 📝 Actualizar nombre e ícono (opcional)
exports.actualizarCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  const nuevoArchivo = req.file?.path;

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const [rows] = await db.query('SELECT icono_public_id FROM categorias WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Categoría no encontrada' });

    let icono_url = null;
    let icono_public_id = rows[0].icono_public_id;

    // 🖼️ Si hay un nuevo ícono, subirlo y eliminar el anterior
    if (nuevoArchivo) {
      if (icono_public_id) await cloudinary.uploader.destroy(icono_public_id);

      const result = await cloudinary.uploader.upload(nuevoArchivo, {
        folder: 'plaxtilineas_categoria',
        public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`
      });

      icono_url = result.secure_url;
      icono_public_id = result.public_id;
    }

    // Construir query dinámica
    let query = 'UPDATE categorias SET nombre = ?';
    const values = [nombre];

    if (icono_url) {
      query += ', icono_url = ?, icono_public_id = ?';
      values.push(icono_url, icono_public_id);
    }

    query += ' WHERE id = ?';
    values.push(id);

    await db.query(query, values);

    res.json({ mensaje: '✅ Categoría actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar categoría:', err.message);
    res.status(500).json({ error: err.message || 'No se pudo actualizar la categoría' });
  }
};

// 🗑️ Eliminar categoría (elimina también el ícono de Cloudinary)
exports.eliminarCategoria = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT icono_public_id FROM categorias WHERE id = ?', [id]);
    const iconoPublicId = rows[0]?.icono_public_id;

    if (iconoPublicId) {
      await cloudinary.uploader.destroy(iconoPublicId);
    }

    await db.query('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ mensaje: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar categoría:', err.message);
    res.status(500).json({ error: 'No se pudo eliminar la categoría' });
  }
};

// 🌳 Construir árbol de categorías + subcategorías
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
    const [results] = await db.query(sql);
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
    console.error('❌ Error en consulta:', err.message);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};
