const db = require('../config/db');

exports.obtenerSubcategorias = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.id, s.nombre, s.categoria_id, c.nombre AS categoria
      FROM subcategorias s
      JOIN categorias c ON s.categoria_id = c.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener subcategorías:', err);
    res.status(500).json({ error: 'No se pudieron obtener las subcategorías' });
  }
};

exports.crearSubcategoria = async (req, res) => {
  const { nombre, categoria_id } = req.body;
  try {
    await db.query('INSERT INTO subcategorias (nombre, categoria_id) VALUES (?, ?)', [nombre, categoria_id]);
    res.status(201).json({ mensaje: 'Subcategoría creada con éxito' });
  } catch (err) {
    console.error('❌ Error al crear subcategoría:', err);
    res.status(500).json({ error: 'No se pudo crear la subcategoría' });
  }
};

exports.actualizarSubcategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre, categoria_id } = req.body;
  try {
    await db.query('UPDATE subcategorias SET nombre = ?, categoria_id = ? WHERE id = ?', [nombre, categoria_id, id]);
    res.json({ mensaje: 'Subcategoría actualizada' });
  } catch (err) {
    console.error('❌ Error al actualizar subcategoría:', err);
    res.status(500).json({ error: 'No se pudo actualizar la subcategoría' });
  }
};

exports.eliminarSubcategoria = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM subcategorias WHERE id = ?', [id]);
    res.json({ mensaje: 'Subcategoría eliminada' });
  } catch (err) {
    console.error('❌ Error al eliminar subcategoría:', err);
    res.status(500).json({ error: 'No se pudo eliminar la subcategoría' });
  }
};
