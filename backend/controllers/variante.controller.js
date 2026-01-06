const db = require('../config/db');

// Obtener todas las variantes de un producto específico
exports.obtenerVariantesPorProducto = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM variantes WHERE producto_id = ? ORDER BY precio ASC',
      [producto_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener variantes:', err);
    res.status(500).json({ error: 'Error al obtener las variantes' });
  }
};

// Crear una nueva variante
exports.crearVariante = async (req, res) => {
  try {
    const { producto_id, nombre, precio } = req.body;

    if (!producto_id || !nombre || isNaN(precio)) {
      return res.status(400).json({ error: 'Datos de variante inválidos' });
    }

    const [result] = await db.query(
      'INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)',
      [producto_id, nombre, precio]
    );

    res.status(201).json({
      mensaje: 'Variante creada con éxito',
      id: result.insertId
    });
  } catch (err) {
    console.error('❌ Error al crear variante:', err);
    res.status(500).json({ error: 'Error interno al crear la variante' });
  }
};

// Actualizar una variante
exports.actualizarVariante = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio } = req.body;

    // Validaciones
    if (!nombre && !precio) {
      return res.status(400).json({ error: 'Debe proporcionar nombre o precio para actualizar' });
    }

    if (precio !== undefined && isNaN(precio)) {
      return res.status(400).json({ error: 'El precio debe ser un número válido' });
    }

    // Construir la consulta dinámicamente
    let query = 'UPDATE variantes SET ';
    const params = [];
    
    if (nombre) {
      query += 'nombre = ?';
      params.push(nombre);
    }
    
    if (precio !== undefined) {
      if (nombre) query += ', ';
      query += 'precio = ?';
      params.push(precio);
    }
    
    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }

    // Obtener la variante actualizada
    const [updated] = await db.query(
      'SELECT * FROM variantes WHERE id = ?',
      [id]
    );

    res.json({
      mensaje: 'Variante actualizada con éxito',
      variante: updated[0]
    });
  } catch (err) {
    console.error('❌ Error al actualizar variante:', err);
    res.status(500).json({ error: 'Error interno al actualizar la variante' });
  }
};

// Eliminar una variante
exports.eliminarVariante = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM variantes WHERE id = ?', [id]);
    res.json({ mensaje: 'Variante eliminada exitosamente' });
  } catch (err) {
    console.error('❌ Error al eliminar variante:', err);
    res.status(500).json({ error: 'No se pudo eliminar la variante' });
  }
};

// Obtener una variante por ID (opcional, útil para el frontend)
exports.obtenerVariantePorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM variantes WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener variante:', err);
    res.status(500).json({ error: 'Error al obtener la variante' });
  }
};