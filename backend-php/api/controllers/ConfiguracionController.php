<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';

class ConfiguracionController
{
    /**
     * Obtener todas las configuraciones
     * GET /api/configuraciones
     */
    public static function getAll()
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->query("SELECT clave, valor FROM configuraciones");
            $configuraciones = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $configuraciones[$row['clave']] = $row['valor'];
            }
            ResponseHandler::success($configuraciones);
        } catch (PDOException $e) {
            ResponseHandler::error("Error al obtener configuraciones: " . $e->getMessage(), 500);
        }
    }

    /**
     * Actualizar una configuración específica
     * PUT /api/configuraciones/:clave
     */
    public static function update($clave)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['valor'])) {
                ResponseHandler::error("Se requiere el campo 'valor'", 400);
                return;
            }

            $valor = $input['valor'];

            $db = Database::getConnection();
            $stmt = $db->prepare("
                INSERT INTO configuraciones (clave, valor) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE valor = ?
            ");
            $stmt->execute([$clave, $valor, $valor]);

            ResponseHandler::success(['mensaje' => 'Configuración actualizada', 'clave' => $clave, 'valor' => $valor]);
        } catch (PDOException $e) {
            ResponseHandler::error("Error al actualizar configuración: " . $e->getMessage(), 500);
        }
    }
}
