<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Logger.php';

/**
 * ChatModerationService - Servicio centralizado de seguridad y moderación del Chat (Backend)
 */
class ChatModerationService
{
    private PDO $db;

    // Palabras prohibidas
    private array $bannedWords = [
        // Insultos colombianos y expresiones fuertes
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

        // Insultos en español general
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

        // Términos sexuales explícitos
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

        // Leetspeak / Variantes
        'ptm', 'ptmr', 'wtf', 'fck', 'fuk', 'fuq',
        'pu7a', 'pv7a', 'h1jueputa', 'm13rda', 's3x0', 's3xo', 'p3nd3jo'
    ];

    // Patrones de Jailbreak / Prompt Injection
    private array $jailbreakPatterns = [
        '/ignora\s+(tus|las|todas)\s+(instrucciones|reglas|ordenes)/i',
        '/olvida\s+(tus|las|todas)\s+(instrucciones|reglas|ordenes)/i',
        '/actua\s+como/i',
        '/pretende\s+ser/i',
        '/fing(?:e|ir)\s+que/i',
        '/modo\s+desarrollador/i',
        '/developer\s+mode/i',
        '/modo\s+sin\s+restricciones/i',
        '/\bDAN\b/',
        '/eres\s+ahora/i',
        '/nuevo\s+rol/i',
        '/system\s+prompt/i',
        '/prompt\s+del\s+sistema/i',
        '/repite\s+lo\s+que\s+dije/i',
        '/dame\s+tu\s+prompt/i',
        '/muestra\s+tu\s+prompt/i',
        '/^>>>/m'
    ];

    // Patrones de inyección de etiquetas del sistema
    private array $systemTagPatterns = [
        '/\[REDIRECT:/i',
        '/\[EXTERNAL:/i',
        '/\[PRODUCTO:/i',
        '/\[PRINT_PDF\]/i',
        '/\[RESUMEN\]/i',
        '/\[SISTEMA\]/i',
        '/\[ADMIN\]/i',
        '/\[ROOT\]/i'
    ];

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->ensureTablesExist();
    }

    /**
     * Asegurar que las tablas de moderación existen en la BD
     */
    private function ensureTablesExist(): void
    {
        try {
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS `chat_moderation_log` (
                  `id` INT AUTO_INCREMENT PRIMARY KEY,
                  `session_id` VARCHAR(100) NOT NULL,
                  `ip` VARCHAR(45) NOT NULL,
                  `mensaje` TEXT NOT NULL,
                  `razon` VARCHAR(100) NOT NULL,
                  `nivel` TINYINT NOT NULL DEFAULT 1,
                  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  INDEX `idx_session` (`session_id`),
                  INDEX `idx_ip` (`ip`),
                  INDEX `idx_razon` (`razon`),
                  INDEX `idx_created` (`created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `chat_session_bans` (
                  `id` INT AUTO_INCREMENT PRIMARY KEY,
                  `session_id` VARCHAR(100) NOT NULL,
                  `ip` VARCHAR(45) NOT NULL,
                  `razon` VARCHAR(200) NOT NULL,
                  `banned_until` TIMESTAMP NOT NULL,
                  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE KEY `uq_session` (`session_id`),
                  INDEX `idx_ip` (`ip`),
                  INDEX `idx_banned_until` (`banned_until`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        } catch (Throwable $e) {
            Logger::error('ChatModerationService::ensureTablesExist', ['exception' => $e->getMessage()]);
        }
    }

    /**
     * Verificar si la sesión o IP tiene un ban activo.
     */
    public function checkSessionBan(string $sessionId, string $ip): ?array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT banned_until, razon 
                FROM chat_session_bans 
                WHERE (session_id = ? OR ip = ?) AND banned_until > NOW()
                ORDER BY banned_until DESC 
                LIMIT 1
            ");
            $stmt->execute([$sessionId, $ip]);
            $ban = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($ban) {
                $bannedUntil = strtotime($ban['banned_until']);
                $remainingSeconds = max(1, $bannedUntil - time());
                return [
                    'is_banned' => true,
                    'razon' => $ban['razon'],
                    'retry_after_seconds' => $remainingSeconds,
                    'banned_until' => $ban['banned_until']
                ];
            }
        } catch (Throwable $e) {
            Logger::error('ChatModerationService::checkSessionBan', ['exception' => $e->getMessage()]);
        }
        return null;
    }

    /**
     * Verificar Límite de Frecuencia (Rate Limiting)
     * Ej: Max 20 msgs/min por sesión
     */
    public function checkRateLimit(string $sessionId, string $ip, int $maxPerMinute = 20): bool
    {
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total 
                FROM chat_historial 
                WHERE session_id = ? 
                  AND rol = 'user' 
                  AND created_at >= NOW() - INTERVAL 1 MINUTE
            ");
            $stmt->execute([$sessionId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (($row['total'] ?? 0) >= $maxPerMinute) {
                return false; // Límite excedido
            }
        } catch (Throwable $e) {
            Logger::error('ChatModerationService::checkRateLimit', ['exception' => $e->getMessage()]);
        }
        return true;
    }

    /**
     * Normalizar texto para análisis de moderación
     */
    public function normalizeText(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        
        // Quitar tildes sin depender exclusivamente de php-intl
        if (function_exists('normalizer_normalize')) {
            $text = preg_replace('~[\x{0300}-\x{036f}]~u', '', normalizer_normalize($text, Normalizer::FORM_D));
        } else {
            $unwanted = [
                'á'=>'a', 'é'=>'e', 'í'=>'i', 'ó'=>'o', 'ú'=>'u', 'ü'=>'u', 'ñ'=>'n',
                'à'=>'a', 'è'=>'e', 'ì'=>'i', 'ò'=>'o', 'ù'=>'u',
                'ä'=>'a', 'ë'=>'e', 'ï'=>'i', 'ö'=>'o', 'ü'=>'u'
            ];
            $text = strtr($text, $unwanted);
        }

        // Reemplazar leet speak
        $replacements = [
            '0' => 'o', '@' => 'o',
            '1' => 'i', '!' => 'i',
            '3' => 'e',
            '4' => 'a',
            '5' => 's',
            '7' => 't'
        ];
        $text = strtr($text, $replacements);
        // Quitar puntos, asteriscos y guiones bajos
        $text = str_replace(['.', '*', '_'], '', $text);
        return $text;
    }

    /**
     * Analizar el contenido del mensaje.
     * Retorna array: ['allowed' => bool, 'razon' => string|null, 'nivel' => int]
     */
    public function checkContent(string $rawText): array
    {
        $normalized = $this->normalizeText($rawText);

        // 1. Detección de Inyección de Etiquetas del Sistema
        foreach ($this->systemTagPatterns as $pattern) {
            if (preg_match($pattern, $rawText)) {
                return [
                    'allowed' => false,
                    'razon' => 'injection',
                    'nivel' => 2,
                    'mensaje_respuesta' => '🚫 El mensaje contiene caracteres o etiquetas no permitidas por el sistema.'
                ];
            }
        }

        // 2. Detección de Patrones de Jailbreak / Prompt Injection
        foreach ($this->jailbreakPatterns as $pattern) {
            if (preg_match($pattern, $normalized)) {
                return [
                    'allowed' => false,
                    'razon' => 'jailbreak',
                    'nivel' => 2,
                    'mensaje_respuesta' => '🔒 Solo puedo responder preguntas relacionadas con Plaxtilineas y sus productos. Por favor mantén una conversación relevante.'
                ];
            }
        }

        // 3. Detección de Palabras Soeces / Inapropiadas
        foreach ($this->bannedWords as $word) {
            $normWord = $this->normalizeText($word);
            $regex = '/(^|\s|[^a-z])' . preg_quote($normWord, '/') . '($|\s|[^a-z])/i';
            if (preg_match($regex, $normalized) || str_contains($normalized, $normWord)) {
                return [
                    'allowed' => false,
                    'razon' => 'profanity',
                    'nivel' => 1,
                    'mensaje_respuesta' => '⚠️ Por favor mantén un lenguaje respetuoso. Estoy aquí para ayudarte con el servicio de Plaxtilineas. 😊'
                ];
            }
        }

        return ['allowed' => true, 'razon' => null, 'nivel' => 0];
    }

    /**
     * Registrar infracción en la BD y gestionar bans progresivos
     */
    public function registerInfraction(string $sessionId, string $ip, string $mensaje, string $razon, int $nivelBase = 1): int
    {
        try {
            // Contar infracciones recientes de esta sesión/IP en las últimas 24h
            $stmtCount = $this->db->prepare("
                SELECT COUNT(*) as total 
                FROM chat_moderation_log 
                WHERE (session_id = ? OR ip = ?) AND created_at >= NOW() - INTERVAL 24 HOUR
            ");
            $stmtCount->execute([$sessionId, $ip]);
            $infractions = (int)($stmtCount->fetch(PDO::FETCH_ASSOC)['total'] ?? 0) + 1;

            $nivelActual = max($nivelBase, $infractions);

            // Registrar log
            $stmtLog = $this->db->prepare("
                INSERT INTO chat_moderation_log (session_id, ip, mensaje, razon, nivel) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmtLog->execute([$sessionId, $ip, mb_substr($mensaje, 0, 500), $razon, $nivelActual]);

            // Determinar si aplica ban automático
            if ($nivelActual >= 3) {
                $minutes = 5;
                if ($nivelActual === 4) $minutes = 30;
                if ($nivelActual >= 5) $minutes = 1440; // 24 horas

                $this->applyBan($sessionId, $ip, "Infracciones acumuladas ({$razon})", $minutes);
            } elseif ($razon === 'jailbreak' && $infractions >= 2) {
                $this->applyBan($sessionId, $ip, "Intento repetido de manipulación del sistema", 15);
            }

            return $nivelActual;
        } catch (Throwable $e) {
            Logger::error('ChatModerationService::registerInfraction', ['exception' => $e->getMessage()]);
            return $nivelBase;
        }
    }

    /**
     * Aplicar un ban de tiempo determinado
     */
    public function applyBan(string $sessionId, string $ip, string $razon, int $minutesDuration): void
    {
        try {
            $bannedUntil = date('Y-m-d H:i:s', strtotime("+{$minutesDuration} minutes"));
            $stmt = $this->db->prepare("
                INSERT INTO chat_session_bans (session_id, ip, razon, banned_until)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    ip = VALUES(ip),
                    razon = VALUES(razon),
                    banned_until = VALUES(banned_until)
            ");
            $stmt->execute([$sessionId, $ip, $razon, $bannedUntil]);
        } catch (Throwable $e) {
            Logger::error('ChatModerationService::applyBan', ['exception' => $e->getMessage()]);
        }
    }
}
