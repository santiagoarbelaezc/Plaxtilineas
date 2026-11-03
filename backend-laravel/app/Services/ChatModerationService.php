<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ChatHistorial;
use App\Models\ChatModerationLog;
use App\Models\ChatSessionBan;
use Illuminate\Support\Carbon;
use Normalizer;

class ChatModerationService
{
    /**
     * @var list<string>
     */
    private array $bannedWords = [
        'puto', 'puta', 'putos', 'putas', 'gonorrea', 'gonorreas',
        'pirobo', 'piroba', 'pirobos', 'pirobas',
        'hp', 'hijueputa', 'hijuepuerca', 'hijuemadre',
        'malparido', 'malparida', 'malparidos', 'malparidas',
        'marica', 'maricas', 'maricon', 'maricona', 'maricones',
        'pendejo', 'pendeja', 'pendejos', 'pendejas',
        'imbecil', 'idiota', 'idiotas',
        'bobo', 'boba', 'bobos', 'bobas',
        'estupido', 'estupida', 'estupidos', 'estupidas',
        'mierda', 'mierdas', 'monda', 'mondá', 'mondas',
        'sapo', 'sapa', 'sapos', 'sapas',
        'perro', 'perra', 'perros', 'perras',
        'desgraciado', 'desgraciada',
        'guevon', 'güevon', 'güevona', 'huevon', 'huevona',
        'mamerto', 'mamerta', 'mojon', 'mojón',
        'culicagado', 'culicagada', 'cagada', 'cagado', 'cagon', 'cagón',
        'bruto', 'bruta', 'burro', 'burra', 'sopenco', 'sopenca',
        'cabron', 'cabrona', 'cabronazo', 'cabrones',
        'cono', 'coño', 'coños',
        'joder', 'jodera', 'jodido', 'jodida',
        'polla', 'pollas', 'culo', 'culos',
        'gilipollas', 'subnormal', 'capullo', 'capullos',
        'mamon', 'mamona', 'mamones',
        'chingar', 'chingado', 'chingada', 'chingados',
        'pinche', 'pinches', 'putazo', 'putazos',
        'maldito', 'maldita', 'malditos', 'malditas',
        'bastardo', 'bastarda', 'bastardos', 'bastardas',
        'miserable', 'miserables', 'inutil', 'inútil',
        'tarado', 'tarada', 'retrasado', 'retrasada',
        'mongolico', 'mongólico', 'cretino', 'cretina',
        'zorra', 'zorras', 'ramera', 'rameras',
        'puta madre', 'hijo de puta', 'me cago', 'vete a la mierda', 'que te jodan',
        'sexo', 'sexos', 'porno', 'pornografia', 'pornografía',
        'xxx', 'xvideos', 'xnxx', 'pornhub',
        'ereccion', 'erección', 'eyaculacion', 'eyaculación',
        'masturbacion', 'masturbación', 'masturbar', 'masturbarse',
        'consolador', 'vibrador', 'dildo', 'orgasmo', 'orgasmos',
        'coito', 'coitos', 'follar', 'fornicacion', 'fornicar', 'copular',
        'pene', 'penes', 'vagina', 'vaginas', 'vulva',
        'teta', 'tetas', 'nalgas', 'nalga',
        'prostituta', 'prostitucion', 'prostitución', 'prepago',
        'desnuda', 'desnudo', 'desnudas', 'desnudos',
        'erotic', 'erotica', 'erótica', 'sexting', 'onlyfans',
        'ptm', 'ptmr', 'wtf', 'fck', 'fuk', 'fuq',
        'pu7a', 'pv7a', 'h1jueputa', 'm13rda', 's3x0', 's3xo', 'p3nd3jo',
    ];

    /**
     * @var list<string>
     */
    private array $jailbreakPatterns = [
        '/ignora\s+(?:todas\s+)?(?:tus|las)?\s*(?:instrucciones|reglas|ordenes)/i',
        '/olvida\s+(?:todas\s+)?(?:tus|las)?\s*(?:instrucciones|reglas|ordenes)/i',
        '/actua\s+como/i',
        '/pretende\s+ser/i',
        '/fing(?:e|ir)\s+que/i',
        '/modo\s+desarrollador/i',
        '/developer\s+mode/i',
        '/modo\s+sin\s+restricciones/i',
        '/\bDAN\b/i',
        '/eres\s+ahora/i',
        '/nuevo\s+rol/i',
        '/system\s+prompt/i',
        '/prompt\s+del\s+sistema/i',
        '/repite\s+lo\s+que\s+dije/i',
        '/dame\s+tu\s+prompt/i',
        '/muestra\s+tu\s+prompt/i',
        '/^>>>/m',
    ];

    /**
     * @var list<string>
     */
    private array $systemTagPatterns = [
        '/\[REDIRECT:/i',
        '/\[EXTERNAL:/i',
        '/\[PRODUCTO:/i',
        '/\[PRINT_PDF\]/i',
        '/\[RESUMEN\]/i',
        '/\[SISTEMA\]/i',
        '/\[ADMIN\]/i',
        '/\[ROOT\]/i',
    ];

    /**
     * @return array{is_banned: bool, razon: string, retry_after_seconds: int, banned_until: string}|null
     */
    public function checkSessionBan(string $sessionId, string $ip): ?array
    {
        /** @var ChatSessionBan|null $ban */
        $ban = ChatSessionBan::where(function ($q) use ($sessionId, $ip) {
            $q->where('session_id', $sessionId)
                ->orWhere('ip', $ip);
        })
            ->where('banned_until', '>', now())
            ->orderByDesc('banned_until')
            ->first();

        if ($ban) {
            $bannedUntil = $ban->banned_until->timestamp;
            $remaining = max(1, $bannedUntil - time());

            return [
                'is_banned' => true,
                'razon' => $ban->razon,
                'retry_after_seconds' => $remaining,
                'banned_until' => $ban->banned_until->toIso8601String(),
            ];
        }

        return null;
    }

    public function checkRateLimit(string $sessionId, string $ip, int $maxPerMinute = 20): bool
    {
        $count = ChatHistorial::where('session_id', $sessionId)
            ->where('rol', 'user')
            ->where('created_at', '>=', now()->subMinute())
            ->count();

        return $count < $maxPerMinute;
    }

    public function normalizeText(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');

        if (function_exists('normalizer_normalize')) {
            $normalized = normalizer_normalize($text, Normalizer::FORM_D);
            if ($normalized !== false) {
                $text = (string) preg_replace('~[\x{0300}-\x{036f}]~u', '', $normalized);
            }
        } else {
            $unwanted = [
                'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
                'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u',
                'ä' => 'a', 'ë' => 'e', 'ï' => 'i', 'ö' => 'o',
            ];
            $text = strtr($text, $unwanted);
        }

        $replacements = [
            '0' => 'o', '@' => 'o',
            '1' => 'i', '!' => 'i',
            '3' => 'e',
            '4' => 'a',
            '5' => 's',
            '7' => 't',
        ];
        $text = strtr($text, $replacements);

        return str_replace(['.', '*', '_'], '', $text);
    }

    /**
     * @return array{allowed: bool, razon: string|null, nivel: int, mensaje_respuesta: string}
     */
    public function checkContent(string $rawText): array
    {
        $normalized = $this->normalizeText($rawText);

        foreach ($this->systemTagPatterns as $pattern) {
            if (preg_match($pattern, $rawText)) {
                return [
                    'allowed' => false,
                    'razon' => 'injection',
                    'nivel' => 2,
                    'mensaje_respuesta' => '🚫 El mensaje contiene caracteres o etiquetas no permitidas por el sistema.',
                ];
            }
        }

        foreach ($this->jailbreakPatterns as $pattern) {
            if (preg_match($pattern, $normalized)) {
                return [
                    'allowed' => false,
                    'razon' => 'jailbreak',
                    'nivel' => 2,
                    'mensaje_respuesta' => '🔒 Solo puedo responder preguntas relacionadas con Plaxtilineas y sus productos. Por favor mantén una conversación relevante.',
                ];
            }
        }

        foreach ($this->bannedWords as $word) {
            $normWord = $this->normalizeText($word);
            $regex = '/(^|\s|[^a-z])'.preg_quote($normWord, '/').'($|\s|[^a-z])/i';
            if (preg_match($regex, $normalized) || str_contains($normalized, $normWord)) {
                return [
                    'allowed' => false,
                    'razon' => 'profanity',
                    'nivel' => 1,
                    'mensaje_respuesta' => '⚠️ Por favor mantén un lenguaje respetuoso. Estoy aquí para ayudarte con el servicio de Plaxtilineas. 😊',
                ];
            }
        }

        return [
            'allowed' => true,
            'razon' => null,
            'nivel' => 0,
            'mensaje_respuesta' => '',
        ];
    }

    public function registerInfraction(string $sessionId, string $ip, string $mensaje, string $razon, int $nivelBase = 1): int
    {
        $infractions = ChatModerationLog::where(function ($q) use ($sessionId, $ip) {
            $q->where('session_id', $sessionId)
                ->orWhere('ip', $ip);
        })
            ->where('created_at', '>=', now()->subHours(24))
            ->count() + 1;

        $nivelActual = max($nivelBase, $infractions);

        ChatModerationLog::create([
            'session_id' => $sessionId,
            'ip' => $ip,
            'mensaje' => mb_substr($mensaje, 0, 500),
            'razon' => $razon,
            'nivel' => $nivelActual,
        ]);

        if ($nivelActual >= 3) {
            $minutes = 5;
            if ($nivelActual === 4) {
                $minutes = 30;
            }
            if ($nivelActual >= 5) {
                $minutes = 1440;
            }

            $this->applyBan($sessionId, $ip, "Infracciones acumuladas ({$razon})", $minutes);
        } elseif ($razon === 'jailbreak' && $infractions >= 2) {
            $this->applyBan($sessionId, $ip, 'Intento repetido de manipulación del sistema', 15);
        }

        return $nivelActual;
    }

    public function applyBan(string $sessionId, string $ip, string $razon, int $minutesDuration): void
    {
        $bannedUntil = Carbon::now()->addMinutes($minutesDuration);

        ChatSessionBan::updateOrCreate(
            ['session_id' => $sessionId],
            [
                'ip' => $ip,
                'razon' => $razon,
                'banned_until' => $bannedUntil,
            ]
        );
    }
}
