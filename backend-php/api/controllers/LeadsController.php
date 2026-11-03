<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * LeadsController – Gestión de leads del modal de registro
 */
class LeadsController
{
    /**
     * POST /api/leads
     * Registra un nuevo lead (pública, sin autenticación)
     */
    public static function create(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $nombre   = trim($input['nombre'] ?? '');
            $telefono = trim($input['telefono'] ?? '');
            $fuente   = trim($input['fuente'] ?? 'modal_bienvenida');

            if (empty($nombre) || empty($telefono)) {
                ResponseHandler::error('Nombre y teléfono son obligatorios.', 422);
                return;
            }

            if (strlen($nombre) < 3) {
                ResponseHandler::error('El nombre debe tener al menos 3 caracteres.', 422);
                return;
            }

            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

            $db = Database::getConnection();

            // Verificar si ya existe este número para no duplicar
            $existente = $db->prepare("SELECT id FROM leads WHERE telefono = ? LIMIT 1");
            $existente->execute([$telefono]);
            if ($existente->fetch()) {
                ResponseHandler::error('Este número de teléfono ya se encuentra registrado.', 409);
                return;
            }

            $stmt = $db->prepare("
                INSERT INTO leads (nombre, telefono, fuente, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$nombre, $telefono, $fuente, $ip, $ua]);

            Logger::info('LeadsController::create', ['nombre' => $nombre, 'fuente' => $fuente]);

            ResponseHandler::success([
                'registrado' => true,
                'id'         => $db->lastInsertId(),
                'mensaje'    => '¡Registro exitoso! Pronto recibirás nuestras novedades.'
            ], 201);

        } catch (Throwable $e) {
            Logger::error('LeadsController::create', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al registrar. Intenta de nuevo.', 500);
        }
    }

    /**
     * GET /api/leads
     * Lista todos los leads (requiere autenticación admin)
     */
    public static function getAll(): void
    {
        try {
            $db = Database::getConnection();

            $pagina   = max(1, (int)($_GET['pagina'] ?? 1));
            $limite   = min(100, max(10, (int)($_GET['limite'] ?? 20)));
            $offset   = ($pagina - 1) * $limite;
            $busqueda = $_GET['buscar'] ?? '';

            if ($busqueda) {
                $like  = "%{$busqueda}%";
                $total = $db->prepare("SELECT COUNT(*) FROM leads WHERE nombre LIKE ? OR telefono LIKE ?");
                $total->execute([$like, $like]);
                $stmt  = $db->prepare("SELECT id, nombre, telefono, fuente, ip_address, created_at FROM leads WHERE nombre LIKE ? OR telefono LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?");
                $stmt->execute([$like, $like, $limite, $offset]);
            } else {
                $total = $db->query("SELECT COUNT(*) FROM leads");
                $stmt  = $db->prepare("SELECT id, nombre, telefono, fuente, ip_address, created_at FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?");
                $stmt->execute([$limite, $offset]);
            }

            ResponseHandler::success([
                'leads'      => $stmt->fetchAll(),
                'total'      => (int)$total->fetchColumn(),
                'pagina'     => $pagina,
                'limite'     => $limite,
                'total_paginas' => ceil($total->fetchColumn() / $limite)
            ]);

        } catch (Throwable $e) {
            Logger::error('LeadsController::getAll', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener leads.', 500);
        }
    }

    /**
     * GET /api/leads/stats
     * Estadísticas de leads: total, por día, por fuente
     */
    public static function getStats(): void
    {
        try {
            $db = Database::getConnection();

            $total    = (int)$db->query("SELECT COUNT(*) FROM leads")->fetchColumn();
            $hoy      = (int)$db->query("SELECT COUNT(*) FROM leads WHERE DATE(created_at) = CURRENT_DATE")->fetchColumn();
            $estaSem  = (int)$db->query("SELECT COUNT(*) FROM leads WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();

            // Últimos 30 días (agrupados por día)
            $porDia = $db->query("
                SELECT DATE(created_at) as fecha, COUNT(*) as total
                FROM leads
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY fecha ASC
            ")->fetchAll();

            // Por fuente
            $porFuente = $db->query("
                SELECT fuente, COUNT(*) as total
                FROM leads
                GROUP BY fuente
                ORDER BY total DESC
            ")->fetchAll();

            ResponseHandler::success([
                'total'      => $total,
                'hoy'        => $hoy,
                'esta_semana'=> $estaSem,
                'por_dia'    => $porDia,
                'por_fuente' => $porFuente,
            ]);

        } catch (Throwable $e) {
            Logger::error('LeadsController::getStats', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener estadísticas de leads.', 500);
        }
    }
}
