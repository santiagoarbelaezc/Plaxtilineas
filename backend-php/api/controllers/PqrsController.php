<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/CloudinaryHelper.php';
require_once __DIR__ . '/../utils/EmailService.php';

/**
 * PqrsController – Peticiones, Quejas, Reclamos y Sugerencias
 */
class PqrsController
{
    private const TIPOS_VALIDOS  = ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA'];
    private const ESTADOS_VALIDOS = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];

    private static function generarUUID(): string
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    private static function generarNumeroTicket(): string
    {
        return 'PQR-' . date('ymd') . '-' . str_pad((string)mt_rand(0, 999), 3, '0', STR_PAD_LEFT);
    }

    // ─── POST /api/pqrs (pública) ─────────────────────────────────────────────
    public static function crearPQR(): void
    {
        // Puede venir como JSON o multipart (con archivos)
        $body = !empty($_POST) ? $_POST : ResponseHandler::getBody();

        $tipo              = ResponseHandler::sanitize($body['tipo'] ?? '');
        $nombre_completo   = ResponseHandler::sanitize($body['nombre_completo'] ?? '');
        $email             = filter_var(trim($body['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $telefono          = ResponseHandler::sanitize($body['telefono'] ?? '');
        $producto_relacionado = ResponseHandler::sanitize($body['producto_relacionado'] ?? '');
        $descripcion       = ResponseHandler::sanitize($body['descripcion'] ?? '');

        // Validaciones
        if (!$tipo || !$nombre_completo || !$email || !$telefono || !$descripcion) {
            ResponseHandler::error('Campos obligatorios faltantes', 400, [
                'campos_requeridos' => ['tipo', 'nombre_completo', 'email', 'telefono', 'descripcion'],
            ]);
        }
        if (!in_array($tipo, self::TIPOS_VALIDOS, true)) {
            ResponseHandler::error('Tipo de PQR inválido', 400, ['tipos_validos' => self::TIPOS_VALIDOS]);
        }
        if (!$email) {
            ResponseHandler::error('Email inválido', 400);
        }

        $db         = Database::getConnection();
        $pqrId      = self::generarUUID();
        $ticket     = self::generarNumeroTicket();

        $db->beginTransaction();
        try {
            $db->prepare("
                INSERT INTO pqrs (id, tipo, nombre_completo, email, telefono, producto_relacionado, descripcion, numero_ticket)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([$pqrId, $tipo, $nombre_completo, $email, $telefono,
                         $producto_relacionado ?: null, $descripcion, $ticket]);

            // Procesar archivos adjuntos
            $archivosSubidos = [];
            if (!empty($_FILES)) {
                foreach ($_FILES as $fileKey => $file) {
                    if (empty($file['tmp_name'])) continue;
                    // Soporte de múltiples archivos bajo el mismo input name (ej: adjuntos[])
                    $tmpNames   = is_array($file['tmp_name']) ? $file['tmp_name'] : [$file['tmp_name']];
                    $origNames  = is_array($file['name'])     ? $file['name']     : [$file['name']];
                    $mimeTypes  = is_array($file['type'])     ? $file['type']     : [$file['type']];

                    foreach ($tmpNames as $i => $tmpName) {
                        if (empty($tmpName)) continue;
                        try {
                            $mime       = $mimeTypes[$i] ?? '';
                            $isImage    = str_starts_with($mime, 'image/');
                            $resourceType = $isImage ? 'image' : 'raw';

                            $result     = CloudinaryHelper::upload($tmpName, 'pqrs', $resourceType);
                            $archivoId  = self::generarUUID();

                            $db->prepare("
                                INSERT INTO pqr_archivos (id, pqr_id, nombre_archivo, url_archivo, tipo_archivo)
                                VALUES (?, ?, ?, ?, ?)
                            ")->execute([$archivoId, $pqrId, $origNames[$i] ?? "archivo_{$i}", $result['url'], $resourceType]);

                            $archivosSubidos[] = [
                                'id'     => $archivoId,
                                'nombre' => $origNames[$i] ?? "archivo_{$i}",
                                'url'    => $result['url'],
                            ];
                        } catch (Throwable $e) {
                            // No fallar toda la PQR por un archivo
                        }
                    }
                }
            }

            $db->commit();

            // Email de confirmación (asíncrono - no bloqueamos respuesta)
            $pqrData = [
                'id'              => $pqrId,
                'numero_ticket'   => $ticket,
                'tipo'            => $tipo,
                'nombre_completo' => $nombre_completo,
                'email'           => $email,
                'telefono'        => $telefono,
                'descripcion'     => $descripcion,
                'estado'          => 'PENDIENTE',
                'fecha_creacion'  => date('d/m/Y H:i'),
            ];
            EmailService::enviarConfirmacionCreacionPQR($pqrData);

            ResponseHandler::success([
                'success' => true,
                'mensaje' => 'PQR creada exitosamente',
                'pqr'     => [
                    'id'             => $pqrId,
                    'numero_ticket'  => $ticket,
                    'tipo'           => $tipo,
                    'estado'         => 'PENDIENTE',
                    'fecha_creacion' => date('c'),
                    'notificacion'   => 'Se ha enviado un correo de confirmación a su email',
                ],
                'archivos' => ['total' => count($archivosSubidos), 'detalles' => $archivosSubidos],
            ], 201);

        } catch (Throwable $e) {
            $db->rollBack();
            ResponseHandler::error('No se pudo crear la PQR', 500);
        }
    }

    // ─── GET /api/pqrs/consulta/:id (pública) ────────────────────────────────
    public static function obtenerPQRPorId(string $id): void
    {
        $db = Database::getConnection();

        $isUUID = (bool)preg_match('/^[0-9a-f\-]{36}$/i', $id);
        $campo  = $isUUID ? 'p.id' : 'p.numero_ticket';

        $stmt = $db->prepare("
            SELECT p.*,
                DATE_FORMAT(p.fecha_creacion,    '%d/%m/%Y %H:%i') AS fecha_creacion_formateada,
                DATE_FORMAT(p.fecha_actualizacion,'%d/%m/%Y %H:%i') AS fecha_actualizacion_formateada
            FROM pqrs p WHERE {$campo} = ?
        ");
        $stmt->execute([$id]);
        $pqr = $stmt->fetch();
        if (!$pqr) ResponseHandler::error('PQR no encontrada', 404);

        // Archivos
        $aStmt = $db->prepare("
            SELECT id, nombre_archivo, url_archivo, tipo_archivo,
                   DATE_FORMAT(fecha_creacion, '%d/%m/%Y %H:%i') AS fecha_subida
            FROM pqr_archivos WHERE pqr_id = ? ORDER BY fecha_creacion
        ");
        $aStmt->execute([$pqr['id']]);
        $archivos = $aStmt->fetchAll();

        // Respuestas
        $rStmt = $db->prepare("
            SELECT id, mensaje, tipo, DATE_FORMAT(fecha_creacion, '%d/%m/%Y %H:%i') AS fecha_respuesta
            FROM pqr_respuestas WHERE pqr_id = ? ORDER BY fecha_creacion ASC
        ");
        $rStmt->execute([$pqr['id']]);
        $respuestas = $rStmt->fetchAll();

        ResponseHandler::success([
            'success' => true,
            'pqr'     => array_merge($pqr, [
                'archivos'        => $archivos,
                'respuestas'      => $respuestas,
                'tiene_archivos'  => count($archivos) > 0,
                'tiene_respuestas' => count($respuestas) > 0,
                'total_archivos'  => count($archivos),
                'total_respuestas' => count($respuestas),
            ]),
        ]);
    }

    // ─── GET /api/pqrs (protegido, admin) ────────────────────────────────────
    public static function obtenerPQRS(): void
    {
        $estado     = ResponseHandler::query('estado');
        $tipo       = ResponseHandler::query('tipo');
        $fechaInicio = ResponseHandler::query('fecha_inicio');
        $fechaFin   = ResponseHandler::query('fecha_fin');
        $limit      = max(1, (int)(ResponseHandler::query('limit') ?? 50));
        $page       = max(1, (int)(ResponseHandler::query('page') ?? 1));

        $where  = 'WHERE 1=1';
        $params = [];

        if ($estado && in_array($estado, self::ESTADOS_VALIDOS, true)) {
            $where .= ' AND p.estado = ?'; $params[] = $estado;
        }
        if ($tipo && in_array($tipo, self::TIPOS_VALIDOS, true)) {
            $where .= ' AND p.tipo = ?'; $params[] = $tipo;
        }
        if ($fechaInicio) { $where .= ' AND DATE(p.fecha_creacion) >= ?'; $params[] = $fechaInicio; }
        if ($fechaFin)    { $where .= ' AND DATE(p.fecha_creacion) <= ?'; $params[] = $fechaFin; }

        $db = Database::getConnection();

        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM pqrs p $where");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetch()['total'];

        $offset       = ($page - 1) * $limit;
        $dataParams   = array_merge($params, [$limit, $offset]);

        $stmt = $db->prepare("
            SELECT p.id, p.tipo, p.nombre_completo, p.email, p.telefono, p.producto_relacionado,
                   p.descripcion, p.estado, p.numero_ticket,
                   DATE_FORMAT(p.fecha_creacion,    '%d/%m/%Y %H:%i') as fecha_creacion_format,
                   DATE_FORMAT(p.fecha_actualizacion,'%d/%m/%Y %H:%i') as fecha_actualizacion_format,
                   COALESCE(r.total_respuestas, 0) as total_respuestas,
                   COALESCE(a.total_archivos, 0) as total_archivos
            FROM pqrs p
            LEFT JOIN (SELECT pqr_id, COUNT(*) as total_respuestas FROM pqr_respuestas GROUP BY pqr_id) r ON p.id = r.pqr_id
            LEFT JOIN (SELECT pqr_id, COUNT(*) as total_archivos   FROM pqr_archivos   GROUP BY pqr_id) a ON p.id = a.pqr_id
            $where ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?
        ");
        $stmt->execute($dataParams);

        ResponseHandler::success([
            'success' => true,
            'data'    => $stmt->fetchAll(),
            'paginacion' => [
                'total'        => $total,
                'pagina_actual' => $page,
                'total_paginas' => (int)ceil($total / $limit),
                'por_pagina'   => $limit,
            ],
        ]);
    }

    // ─── GET /api/pqrs/estadisticas (protegido) ───────────────────────────────
    public static function obtenerEstadisticas(): void
    {
        $db   = Database::getConnection();
        $row  = $db->query("
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN estado='PENDIENTE'   THEN 1 ELSE 0 END) as pendientes,
                   SUM(CASE WHEN estado='EN_PROCESO'  THEN 1 ELSE 0 END) as en_proceso,
                   SUM(CASE WHEN estado='RESUELTO'    THEN 1 ELSE 0 END) as resueltos,
                   SUM(CASE WHEN estado='CERRADO'     THEN 1 ELSE 0 END) as cerrados
            FROM pqrs
        ")->fetch();

        $porTipo = $db->query("
            SELECT tipo, COUNT(*) as total FROM pqrs GROUP BY tipo ORDER BY total DESC
        ")->fetchAll();

        ResponseHandler::success([
            'success'    => true,
            'estadisticas' => $row,
            'por_tipo'   => $porTipo,
        ]);
    }

    // ─── GET /api/pqrs/ultimas (protegido) ────────────────────────────────────
    public static function obtenerUltimaPQR(): void
    {
        $db   = Database::getConnection();
        $stmt = $db->query("
            SELECT id, tipo, nombre_completo, email, estado, numero_ticket,
                   DATE_FORMAT(fecha_creacion, '%d/%m/%Y %H:%i') as fecha_creacion
            FROM pqrs ORDER BY fecha_creacion DESC LIMIT 5
        ");
        ResponseHandler::success(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/pqrs/buscar (protegido) ─────────────────────────────────────
    public static function buscarPQRS(): void
    {
        $q      = ResponseHandler::query('q', '');
        $limit  = max(1, (int)(ResponseHandler::query('limit') ?? 20));
        $term   = '%' . trim((string)$q) . '%';

        $db   = Database::getConnection();
        $stmt = $db->prepare("
            SELECT id, tipo, nombre_completo, email, estado, numero_ticket,
                   DATE_FORMAT(fecha_creacion, '%d/%m/%Y %H:%i') as fecha_creacion
            FROM pqrs
            WHERE nombre_completo LIKE ? OR email LIKE ? OR numero_ticket LIKE ? OR descripcion LIKE ?
            ORDER BY fecha_creacion DESC LIMIT ?
        ");
        $stmt->execute([$term, $term, $term, $term, $limit]);
        ResponseHandler::success(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // ─── PUT /api/pqrs/:id/estado (protegido) ────────────────────────────────
    public static function actualizarEstadoPQR(string $id): void
    {
        $body   = ResponseHandler::getBody();
        $estado = $body['estado'] ?? '';
        $mensaje = ResponseHandler::sanitize($body['mensaje_respuesta'] ?? '');

        if (!in_array($estado, self::ESTADOS_VALIDOS, true)) {
            ResponseHandler::error('Estado inválido', 400, ['estados_validos' => self::ESTADOS_VALIDOS]);
        }

        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT id, numero_ticket, estado FROM pqrs WHERE id = ?');
        $stmt->execute([$id]);
        $pqr  = $stmt->fetch();
        if (!$pqr) ResponseHandler::error('PQR no encontrada', 404);

        $db->beginTransaction();
        try {
            $db->prepare('UPDATE pqrs SET estado=?, fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=?')
               ->execute([$estado, $id]);

            if ($mensaje) {
                $db->prepare("
                    INSERT INTO pqr_respuestas (id, pqr_id, mensaje, tipo) VALUES (?, ?, ?, 'ADMINISTRACION')
                ")->execute([self::generarUUID(), $id, $mensaje]);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            ResponseHandler::error('No se pudo actualizar la PQR', 500);
        }

        ResponseHandler::success([
            'success'       => true,
            'mensaje'       => 'Estado de PQR actualizado correctamente',
            'numero_ticket' => $pqr['numero_ticket'],
            'cambios'       => ['estado_anterior' => $pqr['estado'], 'estado_nuevo' => $estado],
        ]);
    }

    // ─── POST /api/pqrs/:id/respuestas (protegido) ───────────────────────────
    public static function agregarRespuesta(string $id, array $currentUser): void
    {
        $body    = !empty($_POST) ? $_POST : ResponseHandler::getBody();
        $mensaje = ResponseHandler::sanitize($body['mensaje'] ?? '');
        $tipo    = in_array($body['tipo'] ?? '', ['CLIENTE', 'ADMINISTRACION'], true)
                   ? $body['tipo'] : 'ADMINISTRACION';

        if (!$mensaje) ResponseHandler::error('El mensaje es obligatorio', 400);

        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT id, numero_ticket, estado, email, nombre_completo FROM pqrs WHERE id = ?');
        $stmt->execute([$id]);
        $pqr  = $stmt->fetch();
        if (!$pqr) ResponseHandler::error('PQR no encontrada', 404);

        $db->beginTransaction();
        try {
            $respuestaId  = self::generarUUID();
            $db->prepare("INSERT INTO pqr_respuestas (id, pqr_id, mensaje, tipo) VALUES (?, ?, ?, ?)")
               ->execute([$respuestaId, $id, $mensaje, $tipo]);

            $nuevoEstado = $pqr['estado'];
            if ($tipo === 'ADMINISTRACION' && $pqr['estado'] === 'PENDIENTE') {
                $nuevoEstado = 'EN_PROCESO';
                $db->prepare('UPDATE pqrs SET estado=?, fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=?')
                   ->execute([$nuevoEstado, $id]);
            } else {
                $db->prepare('UPDATE pqrs SET fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=?')
                   ->execute([$id]);
            }

            // Archivo adjunto en respuesta
            $archivoAdjunto = null;
            if (!empty($_FILES['adjunto']['tmp_name'])) {
                try {
                    $result = CloudinaryHelper::upload($_FILES['adjunto']['tmp_name'], 'pqrs');
                    $archId = self::generarUUID();
                    $db->prepare("
                        INSERT INTO pqr_archivos (id, pqr_id, nombre_archivo, url_archivo, tipo_archivo) VALUES (?, ?, ?, ?, 'image')
                    ")->execute([$archId, $id, $_FILES['adjunto']['name'] ?? 'adjunto', $result['url']]);
                    $archivoAdjunto = ['id' => $archId, 'url' => $result['url']];
                } catch (Throwable $ignored) {}
            }

            $db->commit();

            // Notificación email admin → cliente
            if ($tipo === 'ADMINISTRACION') {
                EmailService::enviarNotificacionRespuestaPQR($pqr, [
                    'mensaje'     => $mensaje,
                    'tipo'        => $tipo,
                    'estado_nuevo' => $nuevoEstado,
                    'fecha'       => date('d/m/Y H:i'),
                ]);
            }

        } catch (Throwable $e) {
            $db->rollBack();
            ResponseHandler::error('No se pudo agregar la respuesta', 500);
        }

        ResponseHandler::success([
            'success' => true,
            'mensaje' => 'Respuesta agregada correctamente',
            'respuesta' => [
                'id'          => $respuestaId,
                'pqr_id'      => $id,
                'tipo'        => $tipo,
                'mensaje'     => $mensaje,
            ],
            'archivo_adjunto' => $archivoAdjunto,
        ], 201);
    }

    // ─── DELETE /api/pqrs/:id (protegido) ────────────────────────────────────
    public static function eliminarPQR(string $id): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT id, numero_ticket FROM pqrs WHERE id = ?');
        $stmt->execute([$id]);
        $pqr  = $stmt->fetch();
        if (!$pqr) ResponseHandler::error('PQR no encontrada', 404);

        // Obtener archivos para limpiar en Cloudinary
        $archivos = $db->prepare('SELECT url_archivo FROM pqr_archivos WHERE pqr_id = ?');
        $archivos->execute([$id]);
        foreach ($archivos->fetchAll() as $archivo) {
            $pubId = CloudinaryHelper::extractPublicId($archivo['url_archivo']);
            if ($pubId) CloudinaryHelper::delete($pubId);
        }

        $db->beginTransaction();
        try {
            $db->prepare('DELETE FROM pqrs WHERE id = ?')->execute([$id]);
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            ResponseHandler::error('No se pudo eliminar la PQR', 500);
        }

        ResponseHandler::success([
            'success' => true,
            'mensaje' => 'PQR eliminada correctamente',
            'eliminado' => ['pqr_id' => $id, 'numero_ticket' => $pqr['numero_ticket']],
        ]);
    }
}
