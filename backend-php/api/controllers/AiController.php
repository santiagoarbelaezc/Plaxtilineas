<?php
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * AiController - Integración con Groq API para sugerencias e IA
 */
class AiController
{
    private static function callGroqAPI(string $prompt, string $systemPrompt = ""): string
    {
        // Leer la API key desde la variable de entorno
        $apiKey = trim($_ENV['GROQ_API_KEY'] ?? getenv('GROQ_API_KEY') ?? '');
        if (!$apiKey) {
            // Intentar cargar variables desde .env si no está en entorno
            $envFile = __DIR__ . '/../.env';
            if (file_exists($envFile)) {
                $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (strpos(trim($line), '#') === 0) continue;
                    list($name, $value) = explode('=', $line, 2);
                    if (trim($name) === 'GROQ_API_KEY') {
                        $apiKey = trim($value);
                        break;
                    }
                }
            }
        }

        if (!$apiKey) {
            throw new Exception("GROQ_API_KEY no está configurada.");
        }

        $messages = [];
        if (!empty($systemPrompt)) {
            $messages[] = [
                'role' => 'system',
                'content' => $systemPrompt
            ];
        }
        $messages[] = [
            'role' => 'user',
            'content' => $prompt
        ];

        $data = [
            'model' => 'llama-3.3-70b-versatile',
            'messages' => $messages,
            'temperature' => 0.3, // Temperatura baja para más determinismo (especialmente en subcategoría)
            'max_tokens' => 500,
        ];

        $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($httpCode !== 200) {
            $curlError = curl_error($ch);
            Logger::error('Error calling Groq API', ['response' => $response, 'code' => $httpCode, 'curl_error' => $curlError]);
            throw new Exception("Error al comunicarse con la IA. HTTP $httpCode. cURL Error: $curlError | Resp: " . json_encode($response));
        }

        $decoded = json_decode($response, true);
        return $decoded['choices'][0]['message']['content'] ?? '';
    }

    /**
     * POST /api/ia/sugerir-subcategoria
     */
    public static function sugerirSubcategoria(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $nombreProducto = $input['nombre'] ?? '';
            $descripcionProducto = $input['descripcion'] ?? '';
            $subcategorias = $input['subcategorias'] ?? [];

            if (empty($nombreProducto) || empty($subcategorias)) {
                ResponseHandler::error("Faltan parámetros", 400);
            }

            $listaSubcategorias = array_map(function($sub) {
                return "ID: {$sub['id']}, Nombre: {$sub['nombre']} (Categoría: {$sub['categoria']})";
            }, $subcategorias);
            $listaStr = implode("\n", $listaSubcategorias);

            $systemPrompt = "Eres un sistema clasificador de productos experto. Solo debes responder con el ID numérico de la subcategoría correcta. No des explicaciones, ni añadas puntos, ni palabras extra. Si no hay ninguna coincidencia lógica, responde 'null'.";
            
            $prompt = "Tengo un producto llamado '$nombreProducto'.\n";
            if (!empty($descripcionProducto)) {
                $prompt .= "Descripción: '$descripcionProducto'.\n\n";
            } else {
                $prompt .= "\n";
            }
            $prompt .= "Las subcategorías disponibles son:\n" .
                      "$listaStr\n\n" .
                      "¿Cuál es el ID numérico exacto de la subcategoría más adecuada para este producto? Responde SOLO con el número del ID.";

            $responseStr = trim(self::callGroqAPI($prompt, $systemPrompt));
            
            // Extraer solo números de la respuesta por seguridad
            preg_match('/\d+/', $responseStr, $matches);
            $idMatch = $matches[0] ?? null;

            if ($idMatch && is_numeric($idMatch)) {
                ResponseHandler::success(['subcategoria_id' => (int)$idMatch]);
            } else {
                ResponseHandler::success(['subcategoria_id' => null, 'debug' => $responseStr]);
            }

        } catch (Throwable $e) {
            Logger::error('AiController::sugerirSubcategoria', ['exception' => $e->getMessage()]);
            ResponseHandler::error($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/ia/generar-descripcion
     */
    public static function generarDescripcion(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $nombreProducto = $input['nombre'] ?? '';

            if (empty($nombreProducto)) {
                ResponseHandler::error("Nombre del producto es requerido", 400);
            }

            $systemPrompt = "Eres un experto en marketing y redacción publicitaria para e-commerce. Escribe descripciones de productos que sean atractivas, profesionales, persuasivas y optimizadas para SEO. La descripción debe ser de un solo párrafo (o dos cortos) y resaltar posibles beneficios y usos del producto basándose únicamente en su nombre. Usa un tono amigable, vendedor y directo. NUNCA envuelvas tu respuesta entre comillas.";
            
            $prompt = "Escribe una descripción comercial para un producto llamado: '$nombreProducto'";

            $responseStr = self::callGroqAPI($prompt, $systemPrompt);
            
            // Limpiar posibles comillas del principio o final puestas por la IA
            $responseStr = trim($responseStr, "\"'\n\r ");

            ResponseHandler::success(['descripcion' => $responseStr]);

        } catch (Throwable $e) {
            Logger::error('AiController::generarDescripcion', ['exception' => $e->getMessage()]);
            ResponseHandler::error($e->getMessage(), 500);
        }
    }
}
