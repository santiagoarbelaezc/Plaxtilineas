<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * ComponentesController – Gestión de componentes web dinámicos en Landing Page
 */
class ComponentesController
{
    /**
     * GET /api/componentes
     * Obtener lista de componentes activos y ordenados (Público)
     */
    public static function index(): void
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->query("
                SELECT id, tipo, orden, activo, contenido 
                FROM componentes_dinamicos 
                ORDER BY orden ASC
            ");
            $componentes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decodificar el campo JSON del contenido para que llegue estructurado al frontend
            foreach ($componentes as &$c) {
                if (isset($c['contenido'])) {
                    $c['contenido'] = json_decode($c['contenido'], true);
                }
            }

            ResponseHandler::success($componentes);
        } catch (Throwable $e) {
            Logger::error('ComponentesController::index', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener los componentes', 500);
        }
    }

    /**
     * POST /api/componentes
     * Crear un nuevo componente dinámico (Solo Admin)
     */
    public static function create(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $tipo = $input['tipo'] ?? null;
            $contenido = $input['contenido'] ?? null;
            $activo = $input['activo'] ?? 1;

            if (!$tipo || !$contenido) {
                ResponseHandler::error('El tipo de componente y el contenido son obligatorios', 400);
                return;
            }

            $db = Database::getConnection();

            // Calcular el siguiente número de orden para que quede al final por defecto
            $maxOrden = (int)$db->query("SELECT MAX(orden) FROM componentes_dinamicos")->fetchColumn();
            $nuevoOrden = $maxOrden + 1;

            $stmt = $db->prepare("
                INSERT INTO componentes_dinamicos (tipo, orden, activo, contenido) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                $tipo,
                $nuevoOrden,
                $activo,
                json_encode($contenido, JSON_UNESCAPED_UNICODE)
            ]);

            $id = $db->lastInsertId();
            ResponseHandler::success([
                'id' => $id,
                'tipo' => $tipo,
                'orden' => $nuevoOrden,
                'activo' => $activo,
                'contenido' => $contenido
            ], 201);

        } catch (Throwable $e) {
            Logger::error('ComponentesController::create', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al crear el componente', 500);
        }
    }

    /**
     * PUT /api/componentes/{id}
     * Actualizar contenido o estado activo de un componente (Solo Admin)
     */
    public static function update(int $id): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $db = Database::getConnection();

            // Verificar si el componente existe
            $stmtVerif = $db->prepare("SELECT id FROM componentes_dinamicos WHERE id = ?");
            $stmtVerif->execute([$id]);
            if (!$stmtVerif->fetch()) {
                ResponseHandler::error('Componente no encontrado', 404);
                return;
            }

            // Preparar campos a actualizar
            $campos = [];
            $params = [];

            if (isset($input['tipo'])) {
                $campos[] = "tipo = ?";
                $params[] = $input['tipo'];
            }
            if (isset($input['activo'])) {
                $campos[] = "activo = ?";
                $params[] = $input['activo'];
            }
            if (isset($input['contenido'])) {
                $campos[] = "contenido = ?";
                $params[] = json_encode($input['contenido'], JSON_UNESCAPED_UNICODE);
            }

            if (empty($campos)) {
                ResponseHandler::error('No se enviaron datos para actualizar', 400);
                return;
            }

            $params[] = $id; // Agregar id al final para el WHERE
            $sql = "UPDATE componentes_dinamicos SET " . implode(", ", $campos) . " WHERE id = ?";
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            ResponseHandler::success(['actualizado' => true]);

        } catch (Throwable $e) {
            Logger::error('ComponentesController::update', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar el componente', 500);
        }
    }

    /**
     * PUT /api/componentes/reordenar
     * Actualizar el orden de múltiples componentes dinámicos en lote (Solo Admin)
     */
    public static function reordenar(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $ordenIds = $input['orden_ids'] ?? null; // Espera un array de IDs ordenados: [4, 1, 2]

            if (!is_array($ordenIds)) {
                ResponseHandler::error('Debe enviar un array de IDs ordenados', 400);
                return;
            }

            $db = Database::getConnection();
            $db->beginTransaction();

            $stmt = $db->prepare("UPDATE componentes_dinamicos SET orden = ? WHERE id = ?");
            foreach ($ordenIds as $index => $id) {
                $stmt->execute([$index + 1, $id]);
            }

            $db->commit();
            ResponseHandler::success(['reordenado' => true]);

        } catch (Throwable $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('ComponentesController::reordenar', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al guardar el nuevo orden de los componentes', 500);
        }
    }

    /**
     * DELETE /api/componentes/{id}
     * Eliminar un componente dinámico (Solo Admin)
     */
    public static function delete(int $id): void
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("DELETE FROM componentes_dinamicos WHERE id = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                ResponseHandler::error('Componente no encontrado', 404);
                return;
            }

            ResponseHandler::success(['eliminado' => true]);
        } catch (Throwable $e) {
            Logger::error('ComponentesController::delete', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar el componente', 500);
        }
    }

    /**
     * POST /api/componentes/upload
     * Sube una imagen a Cloudinary (Solo Admin)
     */
    public static function uploadImage(): void
    {
        try {
            if (!isset($_FILES['imagen'])) {
                ResponseHandler::error('No se recibió ninguna imagen', 400);
                return;
            }

            require_once __DIR__ . '/../utils/CloudinaryHelper.php';
            $result = CloudinaryHelper::upload($_FILES['imagen']['tmp_name'], 'componentes');

            if (!$result || !isset($result['url'])) {
                ResponseHandler::error('Error al subir la imagen a Cloudinary', 500);
                return;
            }

            ResponseHandler::success([
                'url' => $result['url'],
                'public_id' => $result['public_id'] ?? null
            ]);
        } catch (Throwable $e) {
            Logger::error('ComponentesController::uploadImage', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al procesar la imagen: ' . $e->getMessage(), 500);
        }
    }
}
