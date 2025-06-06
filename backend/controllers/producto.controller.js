const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary'); 

exports.obtenerProductos = async (req, res) => {
  try {
    const { subcategoria_id } = req.query;
    let query = `
      SELECT p.id, p.nombre, p.descripcion, p.cantidad, p.precio, p.imagen_url,
             p.subcategoria_id,
             s.nombre AS subcategoria,
             c.nombre AS categoria
      FROM productos p
      JOIN subcategorias s ON p.subcategoria_id = s.id
      JOIN categorias c ON s.categoria_id = c.id
    `;
    const params = [];
    // Si se incluye un subcategoria_id, se agrega a la query
    if (subcategoria_id) {
      query += ' WHERE p.subcategoria_id = ?';
      params.push(subcategoria_id);
    }
    const [rows] = await db.query(query, params);
    console.log('🧪 Productos desde MySQL:', rows);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener productos:', err);
    res.status(500).json({ error: 'No se pudieron obtener los productos' });
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
    await db.query('DELETE FROM productos WHERE id = ?', [id]);
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    console.error('❌ Error al eliminar producto:', err);
    res.status(500).json({ error: 'No se pudo eliminar el producto' });
  }
};
