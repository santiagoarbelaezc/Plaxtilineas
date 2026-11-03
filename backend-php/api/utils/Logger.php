<?php
require_once __DIR__ . '/../config/config.php';

/**
 * Logger – Registro de eventos en /api/logs/app.log
 *
 * Formato: [2026-03-23 14:30:00] [ERROR] mensaje {"key":"value"}
 */
class Logger
{
    private static string $logDir  = __DIR__ . '/../logs';
    private static string $logFile = __DIR__ . '/../logs/app.log';

    /**
     * Escribir una línea en el log.
     *
     * @param string $level   ERROR | WARNING | INFO | DEBUG
     * @param string $message Descripción del evento
     * @param array  $context Datos adicionales (se serializa a JSON)
     */
    public static function log(string $level, string $message, array $context = []): void
    {
        try {
            // Crear directorio si no existe
            if (!is_dir(self::$logDir)) {
                mkdir(self::$logDir, 0755, true);
            }

            $timestamp   = date('Y-m-d H:i:s');
            $contextJson = empty($context) ? '' : ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $line        = "[{$timestamp}] [" . strtoupper($level) . "] {$message}{$contextJson}" . PHP_EOL;

            file_put_contents(self::$logFile, $line, FILE_APPEND | LOCK_EX);
        } catch (Throwable) {
            // Silenciar errores de escritura — nunca interrumpir la respuesta HTTP
        }
    }

    public static function error(string $message, array $context = []): void
    {
        self::log('ERROR', $message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::log('WARNING', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::log('INFO', $message, $context);
    }
}
