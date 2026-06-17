<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/PedidoController.php';

/**
 * WompiController – Integración con pasarela de pago Wompi (Colombia)
 *
 * Endpoints:
 *   POST /api/wompi/datos-pago  → Genera firma de integridad para el widget (requiere JWT)
 *   POST /api/wompi/webhook     → Recibe eventos de Wompi (NO requiere JWT, verifica firma propia)
 *
 * SEGURIDAD:
 *   - integrity_key y private_key NUNCA salen del servidor
 *   - El webhook verifica firma HMAC-SHA256 antes de cualquier acción
 *   - Idempotencia garantizada por UNIQUE INDEX en wompi_evento_id
 *   - El raw body se lee ANTES de parsear JSON (la firma se calcula sobre el raw)
 */
class WompiController
{
    // ═══════════════════════════════════════════════════════════════════════
    //  1. DATOS DE PAGO — Genera la firma SHA-256 para el widget
    //     Requiere: JWT del usuario autenticado
    //     Body: { pedido_id: number }
    // ═══════════════════════════════════════════════════════════════════════
    public static function datosPago(array $user): void
    {
        // Validar que las claves Wompi estén configuradas
        if (empty(WOMPI_PUBLIC_KEY) || empty(WOMPI_PRIVATE_KEY)) {
            Logger::error('WompiController::datosPago - Claves Wompi no configuradas');
            ResponseHandler::error('Pasarela de pago no configurada. Contacta al administrador.', 503);
            return;
        }

        $input    = json_decode(file_get_contents('php://input'), true);
        $pedidoId = (int)($input['pedido_id'] ?? 0);

        if (!$pedidoId) {
            ResponseHandler::error('pedido_id es requerido.', 400);
            return;
        }

        $db = Database::getConnection();

        // Obtener el pedido y validar que pertenece al usuario autenticado
        $stmt = $db->prepare("
            SELECT id, usuario_id, total, wompi_referencia, estado
            FROM pedidos
            WHERE id = ?
        ");
        $stmt->execute([$pedidoId]);
        $pedido = $stmt->fetch();

        if (!$pedido) {
            ResponseHandler::error('Pedido no encontrado.', 404);
            return;
        }

        // Seguridad: solo el dueño del pedido puede pagar
        if ((int)$pedido['usuario_id'] !== (int)$user['id']) {
            ResponseHandler::error('No autorizado.', 403);
            return;
        }

        // El pedido debe estar en estado 'draft' para poder pagarlo
        if (!in_array($pedido['estado'], ['draft', 'pendiente_pago'])) {
            ResponseHandler::error(
                "El pedido ya fue procesado (estado: {$pedido['estado']}). "
                . "Si tienes dudas, escríbenos.",
                409
            );
            return;
        }

        // Actualizar estado a 'pendiente_pago'
        $db->prepare("UPDATE pedidos SET estado = 'pendiente_pago' WHERE id = ?")->execute([$pedidoId]);

        // ── Calcular monto en centavos (Wompi espera entero) ────────────
        $montoCentavos = (int) round((float)$pedido['total'] * 100);
        $referencia    = $pedido['wompi_referencia'];
        $moneda        = 'COP';

        // ── URL de redirección post-pago ─────────────────────────────────
        $redirectUrl = FRONTEND_URL . '/pago-exitoso';

        // ── Determinar URL base de la API de Wompi ──────────────────────
        $isSandbox = str_starts_with(WOMPI_PRIVATE_KEY, 'prv_test_');
        $apiBase   = $isSandbox
            ? 'https://sandbox.wompi.co/v1'
            : 'https://production.wompi.co/v1';

        // ── Crear Link de Pago via API de Wompi ─────────────────────────
        $linkData = json_encode([
            'name'             => "Pedido {$referencia}",
            'description'      => "Pago de pedido Plaxtilineas #{$pedidoId}",
            'single_use'       => true,
            'collect_shipping'  => false,
            'currency'         => $moneda,
            'amount_in_cents'  => $montoCentavos,
            'redirect_url'     => $redirectUrl,
            'sku'              => $referencia,
        ]);

        $ch = curl_init("{$apiBase}/payment_links");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $linkData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . WOMPI_PRIVATE_KEY,
            ],
        ]);

        $response   = curl_exec($ch);
        $httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError  = curl_error($ch);

        if ($curlError) {
            Logger::error('WompiController::datosPago - Error cURL: ' . $curlError);
            ResponseHandler::error('Error de conexión con la pasarela de pago.', 502);
            return;
        }

        $responseData = json_decode($response, true);

        if ($httpCode < 200 || $httpCode >= 300 || empty($responseData['data']['id'])) {
            Logger::error('WompiController::datosPago - Error API Wompi', [
                'http_code' => $httpCode,
                'response'  => $response,
            ]);
            ResponseHandler::error(
                'No se pudo crear el enlace de pago. Intenta de nuevo.',
                502,
                ['wompi_response' => $responseData]
            );
            return;
        }

        // ── Extraer la URL del link de pago ──────────────────────────────
        $linkId       = $responseData['data']['id'];
        $checkoutUrl  = "https://checkout.wompi.co/l/{$linkId}";

        Logger::error('WompiController::datosPago - Link de pago creado', [
            'pedido_id'    => $pedidoId,
            'link_id'      => $linkId,
            'checkout_url' => $checkoutUrl,
        ]);

        ResponseHandler::success([
            'public_key'      => WOMPI_PUBLIC_KEY,
            'referencia'      => $referencia,
            'monto_centavos'  => $montoCentavos,
            'moneda'          => $moneda,
            'firma'           => '',
            'redirect_url'    => $checkoutUrl,
            'pedido_id'       => $pedidoId,
            'checkout_url'    => $checkoutUrl,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2. WEBHOOK — Recibe y procesa eventos de Wompi
    //     NO requiere JWT (Wompi no envía tokens, usa su propia firma)
    //     SEGURIDAD: Verificar firma HMAC-SHA256 con events_key
    // ═══════════════════════════════════════════════════════════════════════
    public static function webhook(): void
    {
        // ── PASO 1: Leer el raw body ANTES de cualquier parseo ──────────
        // La firma Wompi se calcula sobre el raw body original
        $rawBody = file_get_contents('php://input');

        // ── PASO 2: Parsear el JSON ──────────────────────────────────────
        $evento = json_decode($rawBody, true);

        if (json_last_error() !== JSON_ERROR_NONE || empty($evento)) {
            http_response_code(400);
            echo json_encode(['error' => 'Body inválido']);
            exit;
        }

        // ── PASO 3: Verificar firma del evento ───────────────────────────
        // Wompi envía en el header: X-Event-Checksum
        // Fórmula: SHA256(evento_id + created_at + data.transaction.status + data.transaction.amount_in_cents + events_key)
        $checksum = $_SERVER['HTTP_X_EVENT_CHECKSUM'] ?? null;

        if (empty(WOMPI_EVENTS_KEY)) {
            // Modo de prueba / claves no configuradas: solo loguear
            Logger::error('WompiController::webhook - WOMPI_EVENTS_KEY no configurada, webhook en modo permisivo');
        } elseif ($checksum) {
            $eventoId   = (string)($evento['id'] ?? '');
            $createdAt  = (string)($evento['created_at'] ?? '');
            $status     = (string)($evento['data']['transaction']['status'] ?? '');
            $monto      = (string)($evento['data']['transaction']['amount_in_cents'] ?? '');

            $cadenaFirma   = $eventoId . $createdAt . $status . $monto . WOMPI_EVENTS_KEY;
            $firmaEsperada = hash('sha256', $cadenaFirma);

            if (!hash_equals($firmaEsperada, $checksum)) {
                Logger::error('WompiController::webhook - FIRMA INVÁLIDA', [
                    'checksum_recibido' => $checksum,
                    'firma_esperada'    => $firmaEsperada,
                    'evento_id'         => $eventoId,
                ]);
                // Devolver 401 para que Wompi no marque el webhook como exitoso
                http_response_code(401);
                echo json_encode(['error' => 'Firma de evento inválida']);
                exit;
            }
        }

        // ── PASO 4: Extraer datos del evento ─────────────────────────────
        $eventoId    = (string)($evento['id']                                     ?? '');
        $tipoEvento  = (string)($evento['event']                                  ?? '');
        $referencia  = (string)($evento['data']['transaction']['reference']        ?? '');
        $status      = (string)($evento['data']['transaction']['status']           ?? '');
        $transId     = (string)($evento['data']['transaction']['id']               ?? '');
        $montoCents  = (int)($evento['data']['transaction']['amount_in_cents']    ?? 0);

        Logger::error('WompiController::webhook - Evento recibido', [
            'evento_id'  => $eventoId,
            'tipo'       => $tipoEvento,
            'referencia' => $referencia,
            'status'     => $status,
        ]);

        // Solo procesamos eventos de transacciones
        if ($tipoEvento !== 'transaction.updated') {
            http_response_code(200);
            echo json_encode(['mensaje' => 'Evento ignorado (no es transaction.updated)']);
            exit;
        }

        if (empty($referencia)) {
            http_response_code(200);
            echo json_encode(['mensaje' => 'Sin referencia en el evento']);
            exit;
        }

        // ── PASO 5: Buscar el pedido por referencia ──────────────────────
        $db = Database::getConnection();
        $stmtPedido = $db->prepare(
            "SELECT id, estado FROM pedidos WHERE wompi_referencia = ?"
        );
        $stmtPedido->execute([$referencia]);
        $pedido = $stmtPedido->fetch();

        if (!$pedido) {
            Logger::error('WompiController::webhook - Pedido no encontrado para referencia', [
                'referencia' => $referencia
            ]);
            // Devolver 200 para que Wompi no reintente indefinidamente
            http_response_code(200);
            echo json_encode(['mensaje' => 'Pedido no encontrado']);
            exit;
        }

        // ── PASO 6: Idempotencia — verificar si el evento ya fue procesado
        if (!empty($eventoId)) {
            $stmtCheck = $db->prepare(
                "SELECT id FROM pedidos WHERE wompi_evento_id = ?"
            );
            $stmtCheck->execute([$eventoId]);
            if ($stmtCheck->fetch()) {
                Logger::error('WompiController::webhook - Evento duplicado ignorado', [
                    'evento_id' => $eventoId
                ]);
                http_response_code(200);
                echo json_encode(['mensaje' => 'Evento ya procesado']);
                exit;
            }
        }

        // ── PASO 7: Procesar según el estado de la transacción ───────────
        switch ($status) {
            case 'APPROVED':
                $ok = PedidoController::confirmarPedido(
                    (int)$pedido['id'],
                    $transId,
                    $eventoId,
                    $montoCents
                );
                if ($ok) {
                    Logger::error('WompiController::webhook - APPROVED procesado OK', [
                        'pedido_id'   => $pedido['id'],
                        'referencia'  => $referencia,
                    ]);
                } else {
                    Logger::error('WompiController::webhook - APPROVED: error en confirmarPedido', [
                        'pedido_id' => $pedido['id']
                    ]);
                }
                break;

            case 'VOIDED':
            case 'DECLINED':
            case 'ERROR':
                // Cancelar el pedido y liberar reservas de stock
                $db->prepare("
                    UPDATE pedidos
                    SET estado = 'cancelado',
                        wompi_transaction_id = ?,
                        wompi_evento_id      = ?,
                        fecha_actualizacion  = NOW()
                    WHERE id = ?
                ")->execute([$transId, $eventoId, $pedido['id']]);

                $db->prepare(
                    "DELETE FROM stock_reservas WHERE pedido_id = ?"
                )->execute([$pedido['id']]);

                Logger::error("WompiController::webhook - Transacción {$status}", [
                    'pedido_id'  => $pedido['id'],
                    'referencia' => $referencia,
                ]);
                break;

            default:
                // PENDING u otros: no hacer nada todavía
                Logger::error("WompiController::webhook - Estado sin acción: {$status}", [
                    'pedido_id' => $pedido['id']
                ]);
                break;
        }

        // Siempre responder 200 para que Wompi marque el webhook como recibido
        http_response_code(200);
        echo json_encode(['mensaje' => 'Webhook procesado']);
        exit;
    }
}
