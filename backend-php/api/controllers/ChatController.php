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
            $input = ResponseHandler::getBody();
            $mensajeUsuario = $input['mensaje'] ?? '';
            $sessionId = $input['session_id'] ?? uniqid('session_', true);

            if (empty(trim($mensajeUsuario))) {
                ResponseHandler::error('El mensaje no puede estar vacío', 400);
                return;
            }

            // 1. Guardar mensaje del usuario
            $this->guardarMensaje($sessionId, 'user', $mensajeUsuario);

            // 2. Capa 1: Keywords (Respuestas rápidas)
            $keywordResult = $this->verificarKeywords($mensajeUsuario);
            if ($keywordResult) {
                $this->guardarMensaje($sessionId, 'assistant', $keywordResult['respuesta']);
                ResponseHandler::success([
                    'respuesta' => $keywordResult['respuesta'],
                    'session_id' => $sessionId,
                    'productos' => [],
                    'redirect' => $keywordResult['redirect'] ?? null,
                    'timestamp' => date('c')
                ]);
                return;
            }

            // 3. Capa 2: Groq API
            // Obtener historial (últimos 10 mensajes)
            $historial = $this->obtenerHistorialParaIA($sessionId, 10);
            
            // Obtener productos para contexto (máx 300)
            $productosContexto = $this->obtenerProductosContexto(300);

            try {
                $respuestaIA = $this->llamarGroq($historial, $productosContexto);
                
                // Parsear Redirecciones y enlaces de la IA
                $redirect = null;
                if (preg_match('/\[(?:REDIRECT|EXTERNAL):(.*?)\]/', $respuestaIA, $matches)) {
                    $redirect = trim($matches[1]);
                }
                
                // Limpiar tags [REDIRECT:...] o [EXTERNAL:...] del mensaje final
                $respuestaIA = preg_replace('/\[(?:REDIRECT|EXTERNAL):.*?\]/', '', $respuestaIA);

                $parseado = $this->parsearProductos($respuestaIA);
                
                $this->guardarMensaje($sessionId, 'assistant', $parseado['respuesta']);

                ResponseHandler::success([
                    'respuesta' => $parseado['respuesta'],
                    'session_id' => $sessionId,
                    'productos' => $parseado['productos'],
                    'redirect' => $redirect,
                    'timestamp' => date('c')
                ]);
            } catch (Throwable $e) {
                Logger::error('Error llamando a Groq', ['exception' => $e->getMessage()]);
                $this->guardarMensaje($sessionId, 'assistant', $this->fallbackResponse);
                ResponseHandler::success([
                    'respuesta' => $this->fallbackResponse,
                    'session_id' => $sessionId,
                    'productos' => [],
                    'redirect' => 'https://wa.me/573006680125',
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

    private function verificarKeywords(string $input): ?array
    {
        $input = mb_strtolower($input);
        
        $keywords = [
            'saludo' => ['hola', 'buenas', 'buenos días', 'buenas tardes', 'hey', 'buenos dias'],
            'catalogo' => ['catálogo', 'catalogo', 'productos', 'qué venden', 'referencias', 'que venden', 'ver productos'],
            'precio' => ['precio', 'cuánto cuesta', 'cuanto cuesta', 'valor', 'cotización', 'cotizacion'],
            'envio' => ['envío', 'envio', 'domicilio', 'despacho', 'entrega'],
            'asesor' => ['asesor', 'humano', 'persona', 'hablar con alguien', 'whatsapp', 'teléfono', 'contacto']
        ];

        foreach ($keywords['saludo'] as $k) {
            if (str_contains($input, $k)) {
                return [
                    'respuesta' => "¡Hola! Soy Mateo, tu asistente de Plaxtilineas. ¿En qué puedo ayudarte hoy?",
                    'redirect' => null
                ];
            }
        }
        foreach ($keywords['catalogo'] as $k) {
            if (str_contains($input, $k)) {
                return [
                    'respuesta' => "Contamos con una amplia variedad de productos plásticos. Te redirijo de inmediato al Catálogo oficial para que los explores.",
                    'redirect' => "/productos"
                ];
            }
        }
        foreach ($keywords['precio'] as $k) {
            if (str_contains($input, $k)) {
                return [
                    'respuesta' => "Nuestros precios varían según la cantidad. Te redirijo a la sección de Contacto para cotizaciones o puedes hablar con un asesor.",
                    'redirect' => "/contacto"
                ];
            }
        }
        foreach ($keywords['envio'] as $k) {
            if (str_contains($input, $k)) {
                return [
                    'respuesta' => "Hacemos envíos rápidos a todo el Quindío. Si tienes dudas de tarifas fuera del departamento, puedes consultar a nuestro asesor.",
                    'redirect' => "https://wa.me/573006680125"
                ];
            }
        }
        foreach ($keywords['asesor'] as $k) {
            if (str_contains($input, $k)) {
                return [
                    'respuesta' => "Entendido. Te estoy conectando con nuestro chat oficial de asesoría en WhatsApp. ¡Un momento, por favor!",
                    'redirect' => "https://wa.me/573006680125"
                ];
            }
        }

        // Subcategorías específicas por palabra clave en la Capa 1
        $subcatKeywords = [
            'colchones' => '/busqueda?q=colchones',
            'colchón' => '/busqueda?q=colchones',
            'pisos' => '/busqueda?q=pisos',
            'piso' => '/busqueda?q=pisos',
            'espumas' => '/busqueda?q=espumas',
            'espuma' => '/busqueda?q=espumas',
            'canastos' => '/busqueda?q=canastos',
            'canasto' => '/busqueda?q=canastos',
            'tanques' => '/busqueda?q=tanques',
            'tanque' => '/busqueda?q=tanques',
            'yumbolon' => '/busqueda?q=yumbolon',
            'termoflon' => '/busqueda?q=termoflon'
        ];
        foreach ($subcatKeywords as $key => $route) {
            if (str_contains($input, $key)) {
                return [
                    'respuesta' => "Buscando productos de la sección \"" . ucfirst($key) . "\" en nuestro catálogo...",
                    'redirect' => $route
                ];
            }
        }

        // Redirección de empresas del grupo
        if (str_contains($input, 'districol')) {
            return [
                'respuesta' => "Redirigiéndote al sitio oficial de Colchones Districol...",
                'redirect' => "https://colchonesdistricol.com/"
            ];
        }
        if (str_contains($input, 'espumas y plásticos') || str_contains($input, 'espumasyplasticos')) {
            return [
                'respuesta' => "Redirigiéndote al sitio oficial de Espumas y Plásticos...",
                'redirect' => "https://espumasyplasticos.com/"
            ];
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
            CURLOPT_SSL_VERIFYPEER => false, // Evita problemas de certificado SSL local en Windows
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

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
- Amigable, cálido y profesional. Hablas en español colombiano natural.
- Eres conocedor de todos los productos del catálogo.

REGLAS ESTRICTAS DE RESPUESTA:
1. Respuestas cortas y directas (máx. 2 párrafos).
2. Para recomendar productos del catálogo, DEBES usar ESTRICTAMENTE el formato literal [PRODUCTO:ID] (donde ID es el id numérico). ¡NUNCA cambies la palabra 'PRODUCTO'! Ejemplo correcto: [PRODUCTO:141].
3. SIEMPRE que recomiendes un producto o el usuario busque algo, DEBES agregar al final de tu mensaje una etiqueta literal de redirección usando la palabra clave de búsqueda. Ejemplos:
   - Búsqueda general: [REDIRECT:/busqueda?q=palabra_clave]
   - Para telas: [REDIRECT:/busqueda?q=tela]
   - Para colchones: [REDIRECT:/busqueda?q=colchones]
   - Para pisos: [REDIRECT:/busqueda?q=pisos]
   - Para espumas: [REDIRECT:/busqueda?q=espumas]
4. Si el usuario pide hablar con un humano, agrega la etiqueta: [EXTERNAL:https://wa.me/573006680125]
5. Si el usuario pide ir a secciones específicas, usa estas etiquetas exactas:
   - Colchones Districol: [EXTERNAL:https://colchonesdistricol.com/]
   - Espumas y Plásticos: [EXTERNAL:https://espumasyplasticos.com/]
   - Facebook: [EXTERNAL:https://www.facebook.com/p/Plaxtilineas-100080040966300/]
   - Instagram: [EXTERNAL:https://www.instagram.com/plaxtilineas/]
   - Nosotros: [REDIRECT:/nosotros]
   - Contacto: [REDIRECT:/contacto]
   - Catálogo general: [REDIRECT:/productos]

Catálogo disponible actualmente:
{{PRODUCTOS_JSON}}";
    }
}
