<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * ChatController – Gestión del asistente virtual Mateo con Groq API
 */
class ChatController
{
    private PDO $db;
    private string $fallbackResponse = "En este momento tengo dificultades para procesar tu mensaje 😅. Para ayudarte de inmediato, puedes hablar con uno de nuestros asesores por WhatsApp: https://wa.me/573006680125";

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * POST /api/chat
     */
    public function chat(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $mensajeUsuario = $input['mensaje'] ?? '';
            $sessionId = $input['session_id'] ?? uniqid('session_', true);

            if (empty(trim($mensajeUsuario))) {
                ResponseHandler::error('El mensaje no puede estar vacío', 400);
                return;
            }

            // 1. Guardar mensaje del usuario
            $this->guardarMensaje($sessionId, 'user', $mensajeUsuario);

            // 2. Capa 1: Keywords (Respuestas rápidas)
            $keywordResponse = $this->verificarKeywords($mensajeUsuario);
            if ($keywordResponse) {
                $this->guardarMensaje($sessionId, 'assistant', $keywordResponse);
                ResponseHandler::success([
                    'respuesta' => $keywordResponse,
                    'session_id' => $sessionId,
                    'productos' => [],
                    'timestamp' => date('c')
                ]);
                return;
            }

            // 3. Capa 2: Groq API
            // Obtener historial (últimos 10 mensajes)
            $historial = $this->obtenerHistorialParaIA($sessionId, 10);
            
            // Obtener productos para contexto (máx 20)
            $productosContexto = $this->obtenerProductosContexto(20);

            try {
                $respuestaIA = $this->llamarGroq($historial, $productosContexto);
                $parseado = $this->parsearProductos($respuestaIA);
                
                $this->guardarMensaje($sessionId, 'assistant', $parseado['respuesta']);

                ResponseHandler::success([
                    'respuesta' => $parseado['respuesta'],
                    'session_id' => $sessionId,
                    'productos' => $parseado['productos'],
                    'timestamp' => date('c')
                ]);
            } catch (Throwable $e) {
                Logger::error('Error llamando a Groq', ['exception' => $e->getMessage()]);
                $this->guardarMensaje($sessionId, 'assistant', $this->fallbackResponse);
                ResponseHandler::success([
                    'respuesta' => $this->fallbackResponse,
                    'session_id' => $sessionId,
                    'productos' => [],
                    'timestamp' => date('c')
                ]);
            }

        } catch (Throwable $e) {
            Logger::error('ChatController::chat – Inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error interno al procesar el chat', 500);
        }
    }

    /**
     * GET /api/chat/historial?session_id=xxx
     */
    public function historial(): void
    {
        try {
            $sessionId = $_GET['session_id'] ?? '';
            if (!$sessionId) {
                ResponseHandler::error('Se requiere session_id', 400);
                return;
            }

            $stmt = $this->db->prepare("
                SELECT rol, mensaje, created_at 
                FROM chat_historial 
                WHERE session_id = ? 
                ORDER BY created_at ASC 
                LIMIT 50
            ");
            $stmt->execute([$sessionId]);
            
            ResponseHandler::success(['mensajes' => $stmt->fetchAll()]);

        } catch (Throwable $e) {
            Logger::error('ChatController::historial', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener el historial', 500);
        }
    }

    /**
     * DELETE /api/chat/limpiar?session_id=xxx
     */
    public function limpiar(): void
    {
        try {
            $sessionId = $_GET['session_id'] ?? '';
            if (!$sessionId) {
                ResponseHandler::error('Se requiere session_id', 400);
                return;
            }

            $stmt = $this->db->prepare("DELETE FROM chat_historial WHERE session_id = ?");
            $stmt->execute([$sessionId]);

            ResponseHandler::success(['success' => true, 'mensaje' => 'Historial eliminado']);

        } catch (Throwable $e) {
            Logger::error('ChatController::limpiar', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al limpiar el historial', 500);
        }
    }

    // ─── Helpers Privados ────────────────────────────────────────────────────────

    private function guardarMensaje(string $sessionId, string $rol, string $mensaje): void
    {
        $stmt = $this->db->prepare("INSERT INTO chat_historial (session_id, rol, mensaje) VALUES (?, ?, ?)");
        $stmt->execute([$sessionId, $rol, $mensaje]);
    }

    private function verificarKeywords(string $input): ?string
    {
        $input = mb_strtolower($input);
        
        $keywords = [
            'saludo' => ['hola', 'buenas', 'buenos días', 'buenas tardes', 'hey', 'buenos dias'],
            'catalogo' => ['catálogo', 'catalogo', 'productos', 'qué venden', 'referencias', 'que venden'],
            'precio' => ['precio', 'cuánto cuesta', 'cuanto cuesta', 'valor', 'cotización', 'cotizacion'],
            'envio' => ['envío', 'envio', 'domicilio', 'despacho', 'entrega'],
            'asesor' => ['asesor', 'humano', 'persona', 'hablar con alguien', 'whatsapp']
        ];

        foreach ($keywords['saludo'] as $k) {
            if (str_contains($input, $k)) return "¡Hola! Soy Mateo, tu asistente de Plaxtilineas. ¿En qué puedo ayudarte hoy?";
        }
        foreach ($keywords['catalogo'] as $k) {
            if (str_contains($input, $k)) return "Contamos con una amplia variedad de productos plásticos para el hogar y la construcción. Puedes explorar todo nuestro catálogo en la sección de productos del menú superior.";
        }
        foreach ($keywords['precio'] as $k) {
            if (str_contains($input, $k)) return "Nuestros precios son muy competitivos y varían según la cantidad. Si buscas algo específico, dime qué producto te interesa y te daré una referencia o puedo conectarte con un asesor.";
        }
        foreach ($keywords['envio'] as $k) {
            if (str_contains($input, $k)) return "Realizamos envíos a todo el departamento del Quindío. Para otras ciudades, podemos coordinar el despacho a través de una transportadora con la ayuda de un asesor.";
        }
        foreach ($keywords['asesor'] as $k) {
            if (str_contains($input, $k)) return "Claro que sí, puedes hablar directamente con un asesor humano a través de nuestro WhatsApp oficial: https://wa.me/573006680125";
        }

        return null;
    }

    private function obtenerHistorialParaIA(string $sessionId, int $limite): array
    {
        $stmt = $this->db->prepare("
            SELECT rol as role, mensaje as content 
            FROM chat_historial 
            WHERE session_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$sessionId, $limite]);
        $rows = $stmt->fetchAll();
        
        // El API de OpenAI/Groq espera de viejo a nuevo
        return array_reverse($rows);
    }

    private function obtenerProductosContexto(int $limite): array
    {
        $stmt = $this->db->prepare("
            SELECT p.id, p.nombre, p.precio, c.nombre as categoria
            FROM productos p
            JOIN subcategorias s ON p.subcategoria_id = s.id
            JOIN categorias c ON s.categoria_id = c.id
            LIMIT ?
        ");
        $stmt->execute([$limite]);
        return $stmt->fetchAll();
    }

    private function llamarGroq(array $mensajes, array $productos): string
    {
        $apiKey = $_ENV['GROQ_API_KEY'] ?? getenv('GROQ_API_KEY') ?: '';
        if (!$apiKey) throw new Exception("GROQ_API_KEY no configurada");

        $systemPrompt = str_replace('{{PRODUCTOS_JSON}}', json_encode($productos, JSON_UNESCAPED_UNICODE), $this->getSystemPrompt());

        $payload = [
            'model' => 'llama-3.3-70b-versatile',
            'messages' => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                $mensajes
            ),
            'max_tokens' => 500,
            'temperature' => 0.7,
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
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception('Error en Groq API: ' . $httpCode . ' - ' . $response);
        }

        $data = json_decode($response, true);
        return $data['choices'][0]['message']['content'] ?? 'Lo siento, no pude procesar tu mensaje.';
    }

    private function parsearProductos(string $respuesta): array
    {
        $productos = [];
        preg_match_all('/\[PRODUCTO:(\d+)\]/', $respuesta, $matches);

        if (!empty($matches[1])) {
            foreach (array_unique($matches[1]) as $id) {
                $stmt = $this->db->prepare("
                    SELECT id, nombre, precio, imagen_url 
                    FROM productos 
                    WHERE id = ? LIMIT 1
                ");
                $stmt->execute([(int)$id]);
                $p = $stmt->fetch();

                if ($p) {
                    $productos[] = [
                        'id'     => $p['id'],
                        'nombre' => $p['nombre'],
                        'precio' => $p['precio'],
                        'imagen' => $p['imagen_url'],
                        'url'    => '/productos/' . $p['id'],
                    ];
                }
            }
        }

        $respuestaLimpia = preg_replace('/\[PRODUCTO:\d+\]/', '', $respuesta);
        return [
            'respuesta' => trim($respuestaLimpia),
            'productos' => $productos,
        ];
    }

    private function getSystemPrompt(): string
    {
        return "Eres Mateo, el asistente virtual oficial de Plaxtilineas, una empresa colombiana ubicada en el Quindío que vende productos plásticos de alta calidad para el hogar, la construcción y la industria.

Tu personalidad:
- Amigable, cálido y profesional. Hablas en español colombiano natural (no muy formal, no muy informal).
- Eres conocedor de todos los productos del catálogo.
- Siempre buscas ayudar al cliente a encontrar lo que necesita.
- Nunca inventas productos, precios ni información que no tengas.

Reglas de respuesta:
1. Respuestas cortas y directas (máx. 3 párrafos).
2. Si puedes recomendar un producto del catálogo, hazlo usando el tag [PRODUCTO:ID] donde ID es el id del producto. Ejemplo: \"Te recomiendo este canasto [PRODUCTO:42]\".
3. Si el usuario pregunta por envíos: Plaxtilineas hace entregas en todo el Quindío. Para pedidos fuera del departamento, el cliente debe coordinar con un asesor.
4. Si el usuario quiere hablar con un humano, dale el enlace: https://wa.me/573006680125
5. Si no sabes algo o no tienes la información, sé honesto y ofrece conectar al cliente con un asesor.
6. No hables de competidores ni hagas comparaciones de precios con otras tiendas.

Catálogo disponible actualmente:
{{PRODUCTOS_JSON}}";
    }
}
