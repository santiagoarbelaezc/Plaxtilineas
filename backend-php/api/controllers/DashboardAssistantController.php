<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

class DashboardAssistantController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * POST /api/dashboard-assistant
     */
    public function chat(): void
    {
        try {
            $input = ResponseHandler::getBody();
            $mensajes = $input['mensajes'] ?? [];

            if (empty($mensajes)) {
                ResponseHandler::error('El historial de mensajes no puede estar vacío', 400);
                return;
            }

            $respuestaIA = $this->llamarGroq($mensajes);
            
            // Parsear Redirecciones
            $redirect = null;
            if (preg_match('/\[REDIRECT:(.*?)\]/', $respuestaIA, $matches)) {
                $redirect = trim($matches[1]);
            }
            
            // Parsear Print
            $print = false;
            if (str_contains($respuestaIA, '[PRINT_PDF]')) {
                $print = true;
            }

            // Parsear Resumen (si la IA decide que necesita datos en vivo, podemos buscar el resumen y adjuntarlo a la respuesta)
            if (str_contains($respuestaIA, '[RESUMEN]')) {
                $resumenTexto = $this->generarResumenProductos();
                $respuestaIA = str_replace('[RESUMEN]', "\n\n**Resumen de Inventario:**\n" . $resumenTexto, $respuestaIA);
            }

            // Limpiar tags del texto final
            $respuestaIA = preg_replace('/\[REDIRECT:.*?\]/', '', $respuestaIA);
            $respuestaIA = str_replace('[PRINT_PDF]', '', $respuestaIA);

            ResponseHandler::success([
                'respuesta' => trim($respuestaIA),
                'redirect' => $redirect,
                'print' => $print,
                'timestamp' => date('c')
            ]);

        } catch (Throwable $e) {
            Logger::error('DashboardAssistantController::chat', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error interno al procesar el chat del dashboard', 500);
        }
    }

    private function llamarGroq(array $mensajes): string
    {
        $apiKey = $_ENV['GROQ_API_KEY_DASHBOARD'] ?? getenv('GROQ_API_KEY_DASHBOARD') ?: '';
        if (!$apiKey) {
            // Fallback to normal key if dashboard key isn't set
            $apiKey = $_ENV['GROQ_API_KEY'] ?? getenv('GROQ_API_KEY') ?: '';
        }
        if (!$apiKey) throw new Exception("GROQ_API_KEY_DASHBOARD no configurada");

        $systemPrompt = $this->getSystemPrompt();

        $groqMessages = [['role' => 'system', 'content' => $systemPrompt]];
        
        foreach ($mensajes as $msg) {
            $groqMessages[] = [
                'role' => $msg['sender'] === 'user' ? 'user' : 'assistant',
                'content' => $msg['text']
            ];
        }

        $payload = [
            'model' => 'llama-3.3-70b-versatile',
            'messages' => $groqMessages,
            'max_tokens' => 800,
            'temperature' => 0.5,
        ];

        $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($httpCode !== 200) {
            throw new Exception('Error en Groq API: ' . $httpCode . ' - ' . $response);
        }

        $data = json_decode($response, true);
        return $data['choices'][0]['message']['content'] ?? 'Lo siento, ocurrió un error procesando tu solicitud.';
    }

    private function generarResumenProductos(): string
    {
        // Traer productos con stock bajo o cero para el resumen
        $stmt = $this->db->prepare("
            SELECT p.nombre, p.stock
            FROM productos p
            WHERE p.stock <= 5
            ORDER BY p.stock ASC
            LIMIT 10
        ");
        $stmt->execute();
        $productos = $stmt->fetchAll();

        if (empty($productos)) {
            return "Actualmente, el inventario está en niveles óptimos. No hay productos con stock menor o igual a 5.";
        }

        $resumen = "Actualmente tienes " . count($productos) . " productos con stock bajo o nulo que requieren atención:\n";
        foreach ($productos as $p) {
            $resumen .= "- " . $p['nombre'] . " (Stock: " . $p['stock'] . ")\n";
        }
        return $resumen;
    }

    private function getSystemPrompt(): string
    {
        return "Eres el Asistente Inteligente del Dashboard de Plaxtilineas (Panel de Administración).
Tu labor es ayudar al administrador a gestionar la tienda, darle información y ejecutar acciones en el sistema.

REGLAS ESTRICTAS DE RESPUESTA:
1. Respuestas claras, directas y profesionales.
2. Si el administrador te pide **IR, BUSCAR, REDIRIGIR o MOSTRAR una sección**, incluye EXACTAMENTE ESTA ETIQUETA al final de tu mensaje:
   [REDIRECT:/admin/ruta_correspondiente]
   Las rutas disponibles son:
   - /admin/productos (Inventario, catálogo, productos)
   - /admin/categorias
   - /admin/subcategorias
   - /admin/pqr-admin (Quejas, tickets, atención, pqrs)
   - /admin (Inicio del dashboard)
3. Si el administrador te pide **RESUMIR el inventario, productos faltantes o stock bajo**, incluye EXACTAMENTE ESTA ETIQUETA:
   [RESUMEN]
   (El sistema la reemplazará automáticamente con los datos reales).
4. Si el administrador te pide **IMPRIMIR, CREAR PDF o GENERAR PDF** de la pantalla actual, incluye EXACTAMENTE ESTA ETIQUETA:
   [PRINT_PDF]

Ejemplo de respuesta si el admin pide ir a productos faltantes:
\"Enseguida te muestro el resumen de los productos con bajo stock. [RESUMEN]\"

Ejemplo si pide ir a las quejas:
\"Te redirijo a la sección de PQR para gestionar los tickets. [REDIRECT:/admin/pqr-admin]\"

Ejemplo si pide imprimir la página:
\"Claro, preparando el documento para imprimir. [PRINT_PDF]\"";
    }
}
