<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\AiChatClientInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GroqAiChatService implements AiChatClientInterface
{
    /**
     * @param  list<array{role: string, content: string}>  $mensajes
     * @param  list<array<string, mixed>>  $productosContexto
     */
    public function generarRespuesta(array $mensajes, array $productosContexto, string $systemPrompt): string
    {
        $apiKey = (string) config('services.groq.api_key', '');
        if ($apiKey === '') {
            throw new RuntimeException('GROQ_API_KEY no configurada');
        }

        $promptConProductos = str_replace(
            '{{PRODUCTOS_JSON}}',
            json_encode($productosContexto, JSON_UNESCAPED_UNICODE) ?: '[]',
            $systemPrompt
        );

        $payload = [
            'model' => (string) config('services.groq.model', 'openai/gpt-oss-120b'),
            'messages' => array_merge(
                [['role' => 'system', 'content' => $promptConProductos]],
                $mensajes
            ),
            'max_tokens' => 1000,
            'temperature' => 0.7,
        ];

        $baseUrl = (string) config('services.groq.base_url', 'https://api.groq.com/openai/v1');

        $response = Http::withToken($apiKey)
            ->timeout(30)
            ->post("{$baseUrl}/chat/completions", $payload);

        if (! $response->successful()) {
            Log::error('Error en Groq API', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Error en Groq API: '.$response->status().' - '.$response->body());
        }

        /** @var array{choices?: list<array{message?: array{content?: string}}>} $data */
        $data = $response->json();

        return $data['choices'][0]['message']['content'] ?? 'Lo siento, no pude procesar tu mensaje.';
    }

    /**
     * @param  list<array{role: string, content: string}>  $mensajes
     */
    public function generarRespuestaDashboard(array $mensajes, string $systemPrompt): string
    {
        $apiKey = (string) config('services.groq.dashboard_api_key', '');
        if ($apiKey === '') {
            $apiKey = (string) config('services.groq.api_key', '');
        }

        if ($apiKey === '') {
            throw new RuntimeException('GROQ_API_KEY_DASHBOARD no configurada');
        }

        $groqMessages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $mensajes
        );

        $payload = [
            'model' => (string) config('services.groq.model', 'openai/gpt-oss-120b'),
            'messages' => $groqMessages,
            'max_tokens' => 1000,
            'temperature' => 0.5,
        ];

        $baseUrl = (string) config('services.groq.base_url', 'https://api.groq.com/openai/v1');

        $response = Http::withToken($apiKey)
            ->timeout(30)
            ->post("{$baseUrl}/chat/completions", $payload);

        if (! $response->successful()) {
            Log::error('Error en Groq API Dashboard', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Error en Groq API Dashboard: '.$response->status().' - '.$response->body());
        }

        /** @var array{choices?: list<array{message?: array{content?: string}}>} $data */
        $data = $response->json();

        return $data['choices'][0]['message']['content'] ?? 'Lo siento, ocurrió un error procesando tu solicitud.';
    }
}
