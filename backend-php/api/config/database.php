<?php
require_once __DIR__ . '/config.php';

/**
 * Clase Database – Conexión PDO Singleton
 */
class Database
{
    private static ?PDO $connection = null;
    private static ?PDO $hostingerConnection = null;

    /**
     * Obtener conexión principal (Plaxtilineas DB)
     */
    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            self::$connection = self::createConnection(
                DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
            );
        }
        return self::$connection;
    }

    /**
     * Obtener conexión a la BD catálogo de Hostinger (para importación)
     */
    public static function getHostingerConnection(): PDO
    {
        if (self::$hostingerConnection === null) {
            self::$hostingerConnection = self::createConnection(
                HOSTINGER_DB_HOST, HOSTINGER_DB_PORT,
                HOSTINGER_DB_NAME, HOSTINGER_DB_USER, HOSTINGER_DB_PASSWORD
            );
        }
        return self::$hostingerConnection;
    }

    /**
     * Crear una conexión PDO
     */
    private static function createConnection(
        string $host, string $port, string $dbname,
        string $user, string $password
    ): PDO {
        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            return new PDO($dsn, $user, $password, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Error de conexión a la base de datos']);
            exit;
        }
    }
}
