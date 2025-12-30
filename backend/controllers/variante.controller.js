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