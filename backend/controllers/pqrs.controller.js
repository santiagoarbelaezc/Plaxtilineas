const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary');
const emailService = require('../utils/email.service');

// Utils para reutilización
const generarUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generarNumeroTicket = () => {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const dia = fecha.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PQR-${año}${mes}${dia}-${random}`;
};

const tiposPQRValidos = ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA'];
const estadosPQRValidos = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];

// 🔍 Obtener todas las PQRS (para panel admin)
exports.obtenerPQRS = async (req, res) => {
  try {
    const { estado, tipo, fecha_inicio, fecha_fin, limit = 50, page = 1 } = req.query;
    
    let query = `
      SELECT 
        p.id, 
        p.tipo, 
        p.nombre_completo, 
        p.email, 
        p.telefono, 
        p.producto_relacionado, 
        p.descripcion, 
        p.estado, 
        p.numero_ticket,
        DATE_FORMAT(p.fecha_creacion, '%d/%m/%Y %H:%i') as fecha_creacion_format,
        DATE_FORMAT(p.fecha_actualizacion, '%d/%m/%Y %H:%i') as fecha_actualizacion_format,
        COUNT(DISTINCT r.id) as total_respuestas,
        COUNT(DISTINCT a.id) as total_archivos
      FROM pqrs p
      LEFT JOIN pqr_respuestas r ON p.id = r.pqr_id
      LEFT JOIN pqr_archivos a ON p.id = a.pqr_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filtros
    if (estado && estadosPQRValidos.includes(estado)) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }
    
    if (tipo && tiposPQRValidos.includes(tipo)) {
      query += ' AND p.tipo = ?';
      params.push(tipo);
    }
    
    if (fecha_inicio) {
      query += ' AND DATE(p.fecha_creacion) >= ?';
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      query += ' AND DATE(p.fecha_creacion) <= ?';
      params.push(fecha_fin);
    }
    
    // Contar total
    const [countResult] = await db.query(
      query.replace(
        'SELECT p.id, p.tipo, p.nombre_completo, p.email, p.telefono, p.producto_relacionado, p.descripcion, p.estado, p.numero_ticket, DATE_FORMAT(p.fecha_creacion, \'%d/%m/%Y %H:%i\') as fecha_creacion_format, DATE_FORMAT(p.fecha_actualizacion, \'%d/%m/%Y %H:%i\') as fecha_actualizacion_format, COUNT(DISTINCT r.id) as total_respuestas, COUNT(DISTINCT a.id) as total_archivos',
        'SELECT COUNT(DISTINCT p.id) as total'
      ),
      params
    );
    
    const total = countResult[0].total;
    
    // Paginación
    const offset = (page - 1) * limit;
    query += ' GROUP BY p.id ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await db.query(query, params);
    
    res.json({
      success: true,
      data: rows,
      paginacion: {
        total,
        pagina_actual: parseInt(page),
        total_paginas: Math.ceil(total / limit),
        por_pagina: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error al obtener PQRS:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudieron obtener las PQRS',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
// ✅ Crear nueva PQR (versión actualizada con notificación)
exports.crearPQR = async (req, res) => {
  const {
    tipo,
    nombre_completo,
    email,
    telefono,
    producto_relacionado,
    descripcion
  } = req.body;

  // Validaciones (código existente)
  if (!tipo || !nombre_completo || !email || !telefono || !descripcion) {
    return res.status(400).json({ 
      success: false,
      error: 'Campos obligatorios faltantes',
      campos_requeridos: ['tipo', 'nombre_completo', 'email', 'telefono', 'descripcion']
    });
  }

  if (!tiposPQRValidos.includes(tipo)) {
    return res.status(400).json({ 
      success: false,
      error: 'Tipo de PQR inválido',
      tipos_validos: tiposPQRValidos
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      error: 'Email inválido'
    });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const pqrId = generarUUID();
    const numeroTicket = generarNumeroTicket();
    const fechaCreacion = new Date();

    // Insertar PQR
    await connection.query(
      `INSERT INTO pqrs (id, tipo, nombre_completo, email, telefono, producto_relacionado, descripcion, numero_ticket) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pqrId, tipo, nombre_completo.trim(), email.trim(), telefono.trim(), 
       producto_relacionado?.trim() || null, descripcion.trim(), numeroTicket]
    );

    // Procesar archivos adjuntos (código existente)
    let archivosSubidos = [];
    const cloudinaryResults = req.cloudinaryResults || [];
    
    if (cloudinaryResults.length > 0) {
      console.log(`📁 Procesando ${cloudinaryResults.length} archivos para PQR ${numeroTicket}`);
      
      for (let i = 0; i < cloudinaryResults.length; i++) {
        try {
          const cloudinaryResult = cloudinaryResults[i];
          const file = req.files?.[i] || {};
          
          const fileUrl = cloudinaryResult.url;
          const publicId = cloudinaryResult.public_id;
          
          let tipoArchivo = 'desconocido';
          if (file.mimetype) {
            tipoArchivo = file.mimetype.split('/')[1] || file.mimetype;
          } else if (cloudinaryResult.format) {
            tipoArchivo = cloudinaryResult.format;
          }

          const archivoId = generarUUID();
          await connection.query(
            `INSERT INTO pqr_archivos (id, pqr_id, nombre_archivo, url_archivo, tipo_archivo) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              archivoId,
              pqrId,
              file.originalname || `archivo_${Date.now()}`,
              fileUrl,
              tipoArchivo
            ]
          );

          archivosSubidos.push({
            id: archivoId,
            nombre: file.originalname || `archivo_${i}`,
            url: fileUrl,
            public_id: publicId,
            tipo: tipoArchivo,
            size: file.size || 0
          });

        } catch (uploadError) {
          console.error('❌ Error procesando archivo:', uploadError.message);
        }
      }
    }

    await connection.commit();

    // 🔔 ENVIAR NOTIFICACIÓN POR EMAIL (ASÍNCRONO)
    try {
      const pqrData = {
        id: pqrId,
        numero_ticket: numeroTicket,
        tipo: tipo,
        nombre_completo: nombre_completo.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        producto_relacionado: producto_relacionado?.trim() || null,
        descripcion: descripcion.trim(),
        estado: 'PENDIENTE',
        fecha_creacion: fechaCreacion.toLocaleString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      // Enviar email de confirmación (no esperar respuesta para no retrasar la respuesta al cliente)
      emailService.enviarConfirmacionCreacionPQR(pqrData)
        .then(result => {
          if (result.success) {
            console.log(`✅ Email de confirmación enviado a ${pqrData.email}`);
          } else {
            console.warn(`⚠️ No se pudo enviar email a ${pqrData.email}:`, result.error);
          }
        })
        .catch(emailError => {
          console.error(`❌ Error en envío de email:`, emailError.message);
        });

    } catch (emailError) {
      console.error('⚠️ Error al preparar notificación por email:', emailError.message);
      // No fallar la creación de PQR si hay error en el email
    }

    // Respuesta inmediata al cliente
    res.status(201).json({
      success: true,
      mensaje: '✅ PQR creada exitosamente',
      pqr: {
        id: pqrId,
        numero_ticket: numeroTicket,
        tipo,
        estado: 'PENDIENTE',
        fecha_creacion: fechaCreacion.toISOString(),
        notificacion: 'Se ha enviado un correo de confirmación a su email'
      },
      archivos: {
        total: archivosSubidos.length,
        detalles: archivosSubidos
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Error al crear PQR:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo crear la PQR',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
};

// 💬 Agregar respuesta a PQR (versión actualizada con notificación)
exports.agregarRespuesta = async (req, res) => {
  const { id } = req.params;
  const { mensaje, tipo = 'ADMINISTRACION', responsable } = req.body;

  if (!mensaje || !mensaje.trim()) {
    return res.status(400).json({ 
      success: false,
      error: 'El mensaje es obligatorio' 
    });
  }

  const tiposRespuestaValidos = ['CLIENTE', 'ADMINISTRACION'];
  if (!tiposRespuestaValidos.includes(tipo)) {
    return res.status(400).json({ 
      success: false,
      error: 'Tipo de respuesta inválido',
      tipos_validos: tiposRespuestaValidos
    });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Verificar que la PQR existe
    const [pqrExistente] = await connection.query(
      'SELECT id, numero_ticket, estado, tipo, nombre_completo, email, producto_relacionado FROM pqrs WHERE id = ?',
      [id]
    );

    if (pqrExistente.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'PQR no encontrada' 
      });
    }

    const pqr = pqrExistente[0];
    const fechaActualizacion = new Date();

    // Insertar respuesta
    const respuestaId = generarUUID();
    await connection.query(
      'INSERT INTO pqr_respuestas (id, pqr_id, mensaje, tipo) VALUES (?, ?, ?, ?)',
      [respuestaId, id, mensaje.trim(), tipo]
    );

    // Procesar archivo adjunto si existe
    let archivoAdjunto = null;
    if (req.cloudinaryResult) {
      const archivoId = generarUUID();
      await connection.query(
        `INSERT INTO pqr_archivos 
         (id, pqr_id, nombre_archivo, url_archivo, tipo_archivo, es_respuesta) 
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [
          archivoId,
          id,
          req.file?.originalname || `adjunto_respuesta_${Date.now()}`,
          req.cloudinaryResult.url,
          req.cloudinaryResult.format || 'desconocido'
        ]
      );
      
      archivoAdjunto = {
        id: archivoId,
        url: req.cloudinaryResult.url,
        nombre: req.file?.originalname || 'adjunto',
        tipo: req.cloudinaryResult.format || 'desconocido'
      };
    }

    // Actualizar estado si es respuesta de administración y estaba pendiente
    let nuevoEstado = pqr.estado;
    if (tipo === 'ADMINISTRACION' && pqr.estado === 'PENDIENTE') {
      nuevoEstado = 'EN_PROCESO';
      await connection.query(
        'UPDATE pqrs SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
        [nuevoEstado, id]
      );
    } else if (tipo === 'ADMINISTRACION') {
      await connection.query(
        'UPDATE pqrs SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    }

    await connection.commit();

    // 🔔 ENVIAR NOTIFICACIÓN POR EMAIL SI ES RESPUESTA DE ADMINISTRACIÓN
    if (tipo === 'ADMINISTRACION') {
      try {
        const pqrData = {
          ...pqr,
          estado: nuevoEstado,
          fecha_actualizacion: fechaActualizacion.toLocaleString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };

        const respuestaData = {
          mensaje: mensaje.trim(),
          tipo: tipo,
          responsable: responsable || req.user?.nombre || 'Equipo de soporte',
          archivo_adjunto: archivoAdjunto,
          fecha: fechaActualizacion.toISOString()
        };

        // Enviar notificación (asíncrono)
        emailService.enviarNotificacionRespuestaPQR(pqrData, respuestaData)
          .then(result => {
            if (result.success) {
              console.log(`✅ Notificación de respuesta enviada a ${pqr.email}`);
            } else {
              console.warn(`⚠️ No se pudo enviar notificación a ${pqr.email}:`, result.error);
            }
          })
          .catch(emailError => {
            console.error(`❌ Error en envío de notificación:`, emailError.message);
          });

      } catch (emailError) {
        console.error('⚠️ Error al preparar notificación de respuesta:', emailError.message);
        // Continuar sin fallar la operación principal
      }
    }

    const respuesta = {
      success: true,
      mensaje: '✅ Respuesta agregada correctamente',
      respuesta: {
        id: respuestaId,
        pqr_id: id,
        numero_ticket: pqr.numero_ticket,
        tipo,
        mensaje: mensaje.trim(),
        fecha: fechaActualizacion.toISOString(),
        notificacion: tipo === 'ADMINISTRACION' ? 'Se ha enviado notificación al cliente' : 'Respuesta registrada'
      }
    };

    if (archivoAdjunto) {
      respuesta.archivo_adjunto = archivoAdjunto;
    }

    res.status(201).json(respuesta);

  } catch (err) {
    await connection.rollback();
    console.error('❌ Error al agregar respuesta:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo agregar la respuesta',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
};

// 🔍 Obtener PQR por ID o número de ticket
exports.obtenerPQRPorId = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Determinar tipo de búsqueda
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const campoBusqueda = isUUID ? 'p.id' : 'p.numero_ticket';
    
    const [pqrRows] = await db.query(
      `SELECT 
        p.*,
        DATE_FORMAT(p.fecha_creacion, '%d/%m/%Y %H:%i') as fecha_creacion_formateada,
        DATE_FORMAT(p.fecha_actualizacion, '%d/%m/%Y %H:%i') as fecha_actualizacion_formateada
       FROM pqrs p
       WHERE ${campoBusqueda} = ?`,
      [id]
    );

    if (pqrRows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'PQR no encontrada',
        id_buscado: id
      });
    }

    const pqr = pqrRows[0];

    // Obtener archivos adjuntos
    const [archivos] = await db.query(
      `SELECT 
        id, nombre_archivo, url_archivo, tipo_archivo, es_respuesta,
        DATE_FORMAT(fecha_creacion, '%d/%m/%Y %H:%i') as fecha_subida
       FROM pqr_archivos 
       WHERE pqr_id = ? 
       ORDER BY fecha_creacion`,
      [pqr.id]
    );

    // Obtener respuestas
    const [respuestas] = await db.query(
      `SELECT 
        id, mensaje, tipo,
        DATE_FORMAT(fecha_creacion, '%d/%m/%Y %H:%i') as fecha_respuesta
       FROM pqr_respuestas 
       WHERE pqr_id = ? 
       ORDER BY fecha_creacion ASC`,
      [pqr.id]
    );

    res.json({
      success: true,
      pqr: {
        ...pqr,
        archivos,
        respuestas,
        tiene_archivos: archivos.length > 0,
        tiene_respuestas: respuestas.length > 0,
        total_archivos: archivos.length,
        total_respuestas: respuestas.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Error al obtener PQR:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo obtener la PQR',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 📝 Actualizar estado de PQR
exports.actualizarEstadoPQR = async (req, res) => {
  const { id } = req.params;
  const { estado, mensaje_respuesta } = req.body;

  if (!estado || !estadosPQRValidos.includes(estado)) {
    return res.status(400).json({ 
      success: false,
      error: 'Estado inválido',
      estados_validos: estadosPQRValidos
    });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Verificar que la PQR existe
    const [pqrExistente] = await connection.query(
      'SELECT id, numero_ticket, estado FROM pqrs WHERE id = ?',
      [id]
    );

    if (pqrExistente.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'PQR no encontrada' 
      });
    }

    const pqr = pqrExistente[0];
    const estadoAnterior = pqr.estado;

    // Actualizar estado
    await connection.query(
      'UPDATE pqrs SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
      [estado, id]
    );

    // Si hay mensaje de respuesta, guardarlo
    if (mensaje_respuesta && mensaje_respuesta.trim()) {
      const respuestaId = generarUUID();
      await connection.query(
        'INSERT INTO pqr_respuestas (id, pqr_id, mensaje, tipo) VALUES (?, ?, ?, "ADMINISTRACION")',
        [respuestaId, id, mensaje_respuesta.trim()]
      );
    }

    await connection.commit();

    res.json({ 
      success: true,
      mensaje: '✅ Estado de PQR actualizado correctamente',
      pqr_id: id,
      numero_ticket: pqr.numero_ticket,
      cambios: {
        estado_anterior: estadoAnterior,
        estado_nuevo: estado,
        actualizado: estado !== estadoAnterior
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Error al actualizar estado de PQR:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo actualizar la PQR',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
};


// 🗑️ Eliminar PQR
exports.eliminarPQR = async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Obtener información de la PQR
    const [pqrInfo] = await connection.query(
      'SELECT id, numero_ticket FROM pqrs WHERE id = ?',
      [id]
    );

    if (pqrInfo.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'PQR no encontrada' 
      });
    }

    const numeroTicket = pqrInfo[0].numero_ticket;

    // Obtener archivos para eliminar de Cloudinary
    const [archivos] = await connection.query(
      'SELECT url_archivo FROM pqr_archivos WHERE pqr_id = ?',
      [id]
    );

    // Eliminar archivos de Cloudinary
    let archivosEliminados = 0;
    
    for (const archivo of archivos) {
      try {
        const url = archivo.url_archivo;
        const urlParts = url.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        
        if (uploadIndex > -1) {
          let pathParts = urlParts.slice(uploadIndex + 1);
          
          if (pathParts[0] && pathParts[0].startsWith('v')) {
            pathParts = pathParts.slice(1);
          }
          
          if (pathParts.length > 0) {
            let publicId = pathParts.join('/');
            const lastDotIndex = publicId.lastIndexOf('.');
            if (lastDotIndex > -1) {
              publicId = publicId.substring(0, lastDotIndex);
            }
            
            const result = await cloudinary.uploader.destroy(publicId);
            if (result.result === 'ok') {
              archivosEliminados++;
            }
          }
        }
      } catch (cloudinaryError) {
        console.warn('⚠️ Error eliminando archivo de Cloudinary:', cloudinaryError.message);
      }
    }

    // Eliminar PQR (CASCADE eliminará archivos y respuestas)
    await connection.query('DELETE FROM pqrs WHERE id = ?', [id]);

    await connection.commit();

    res.json({ 
      success: true,
      mensaje: '✅ PQR eliminada correctamente',
      eliminado: {
        pqr_id: id,
        numero_ticket: numeroTicket,
        archivos_eliminados_cloudinary: archivosEliminados,
        total_archivos_bd: archivos.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Error al eliminar PQR:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo eliminar la PQR',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
};

// 📊 Obtener estadísticas de PQRS
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const [estadisticas] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'EN_PROCESO' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'RESUELTO' THEN 1 ELSE 0 END) as resueltas,
        SUM(CASE WHEN estado = 'CERRADO' THEN 1 ELSE 0 END) as cerradas,
        SUM(CASE WHEN tipo = 'PETICION' THEN 1 ELSE 0 END) as peticiones,
        SUM(CASE WHEN tipo = 'QUEJA' THEN 1 ELSE 0 END) as quejas,
        SUM(CASE WHEN tipo = 'RECLAMO' THEN 1 ELSE 0 END) as reclamos,
        SUM(CASE WHEN tipo = 'SUGERENCIA' THEN 1 ELSE 0 END) as sugerencias,
        AVG(TIMESTAMPDIFF(HOUR, fecha_creacion, fecha_actualizacion)) as tiempo_promedio_horas,
        MAX(fecha_creacion) as ultima_pqr,
        MIN(fecha_creacion) as primera_pqr
      FROM pqrs
    `);

    // PQRS del último mes
    const [ultimoMes] = await db.query(`
      SELECT 
        DATE(fecha_creacion) as fecha,
        COUNT(*) as cantidad,
        GROUP_CONCAT(tipo SEPARATOR ', ') as tipos
      FROM pqrs
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(fecha_creacion)
      ORDER BY fecha DESC
      LIMIT 15
    `);

    // Estadísticas por tipo
    const [porTipo] = await db.query(`
      SELECT 
        tipo,
        COUNT(*) as cantidad,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pqrs), 1) as porcentaje,
        AVG(TIMESTAMPDIFF(HOUR, fecha_creacion, fecha_actualizacion)) as tiempo_promedio_horas
      FROM pqrs
      GROUP BY tipo
      ORDER BY cantidad DESC
    `);

    res.json({
      success: true,
      estadisticas: {
        generales: estadisticas[0],
        tendencia_30_dias: ultimoMes,
        distribucion_por_tipo: porTipo
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Error al obtener estadísticas:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudieron obtener las estadísticas',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🔍 Buscar PQRS
exports.buscarPQRS = async (req, res) => {
  const { q, campo = 'todo' } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ 
      success: false,
      error: 'Término de búsqueda muy corto',
      minimo_caracteres: 2
    });
  }

  try {
    const terminoBusqueda = `%${q.trim()}%`;
    let query = '';
    const params = [terminoBusqueda];

    const camposBusqueda = {
      nombre: 'p.nombre_completo LIKE ?',
      email: 'p.email LIKE ?',
      telefono: 'p.telefono LIKE ?',
      ticket: 'p.numero_ticket LIKE ?',
      producto: 'p.producto_relacionado LIKE ?',
      descripcion: 'p.descripcion LIKE ?'
    };

    if (campo in camposBusqueda) {
      query = `
        SELECT 
          p.*,
          DATE_FORMAT(p.fecha_creacion, '%d/%m/%Y %H:%i') as fecha_creacion_format
        FROM pqrs p
        WHERE ${camposBusqueda[campo]}
        ORDER BY p.fecha_creacion DESC 
        LIMIT 50
      `;
    } else {
      // Búsqueda en todos los campos
      query = `
        SELECT 
          p.*,
          DATE_FORMAT(p.fecha_creacion, '%d/%m/%Y %H:%i') as fecha_creacion_format,
          COUNT(DISTINCT r.id) as total_respuestas,
          COUNT(DISTINCT a.id) as total_archivos
        FROM pqrs p
        LEFT JOIN pqr_respuestas r ON p.id = r.pqr_id
        LEFT JOIN pqr_archivos a ON p.id = a.pqr_id
        WHERE 
          p.nombre_completo LIKE ? OR 
          p.email LIKE ? OR 
          p.telefono LIKE ? OR 
          p.numero_ticket LIKE ? OR 
          p.producto_relacionado LIKE ? OR 
          p.descripcion LIKE ?
        GROUP BY p.id
        ORDER BY p.fecha_creacion DESC 
        LIMIT 50
      `;
      params.push(...Array(5).fill(terminoBusqueda));
    }

    const [resultados] = await db.query(query, params);
    
    res.json({
      success: true,
      busqueda: {
        termino: q,
        campo: campo === 'todo' ? 'todos los campos' : campo,
        total_resultados: resultados.length
      },
      resultados,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Error buscando PQRS:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error en la búsqueda',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🔄 Obtener últimas PQRS
exports.obtenerUltimaPQR = async (req, res) => {
  try {
    const [ultimas] = await db.query(`
      SELECT 
        p.*,
        DATE_FORMAT(p.fecha_creacion, '%d/%m/%Y %H:%i') as fecha_creacion_format,
        COUNT(DISTINCT r.id) as total_respuestas,
        COUNT(DISTINCT a.id) as total_archivos
      FROM pqrs p
      LEFT JOIN pqr_respuestas r ON p.id = r.pqr_id
      LEFT JOIN pqr_archivos a ON p.id = a.pqr_id
      GROUP BY p.id
      ORDER BY p.fecha_creacion DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      ultimas_pqrs: ultimas,
      total: ultimas.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error al obtener últimas PQRS:', err);
    res.status(500).json({ 
      success: false,
      error: 'No se pudieron obtener las últimas PQRS',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};