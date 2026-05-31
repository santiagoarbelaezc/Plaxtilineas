<?php
require_once __DIR__ . '/../config/config.php';

/**
 * CloudinaryHelper – Subir y eliminar imágenes usando la API REST de Cloudinary
 * No requiere la SDK de Cloudinary, usa cURL directamente.
 */
class CloudinaryHelper
{
    /**
     * Subir un archivo a Cloudinary
     *
     * @param string $fileTmpPath  Ruta temporal del archivo ($_FILES['...']['tmp_name'])
     * @param string $folder       Carpeta en Cloudinary (ej: 'productos', 'categorias')
     * @param string $resourceType 'image' | 'raw' (para PDFs, docs)
     * @return array ['url' => string, 'public_id' => string]
     * @throws RuntimeException
     */
    public static function upload(
        string $fileTmpPath,
        string $folder = 'plaxtilineas',
        string $resourceType = 'image'
    ): array {
        $timestamp  = time();
        $paramsToSign = "folder={$folder}&timestamp={$timestamp}";
        $signature  = hash('sha256', $paramsToSign . CLOUDINARY_API_SECRET);

        $uploadUrl = CLOUDINARY_UPLOAD_URL . $resourceType . '/upload';

        $postFields = [
            'file'        => new CURLFile($fileTmpPath),
            'folder'      => $folder,
            'timestamp'   => $timestamp,
            'api_key'     => CLOUDINARY_API_KEY,
            'signature'   => $signature,
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $uploadUrl,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $postFields,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_SSL_VERIFYPEER => false, // Evita errores de certificado SSL local en Windows
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);

        if ($response === false) {
            throw new RuntimeException('Error de cURL al subir a Cloudinary: ' . $curlError);
        }
        if ($httpCode >= 400) {
            throw new RuntimeException('Error HTTP ' . $httpCode . ' al subir a Cloudinary: ' . $response);
        }

        $data = json_decode($response, true);

        if (!isset($data['secure_url'])) {
            throw new RuntimeException('Respuesta de Cloudinary inválida: ' . $response);
        }

        return [
            'url'       => $data['secure_url'],
            'public_id' => $data['public_id'],
        ];
    }

    /**
     * Eliminar un recurso de Cloudinary por su public_id
     *
     * @param string $publicId     El public_id del recurso
     * @param string $resourceType 'image' | 'raw'
     * @return bool
     */
    public static function delete(string $publicId, string $resourceType = 'image'): bool
    {
        $timestamp  = time();
        $paramsToSign = "public_id={$publicId}&timestamp={$timestamp}";
        $signature  = hash('sha256', $paramsToSign . CLOUDINARY_API_SECRET);

        $deleteUrl = CLOUDINARY_UPLOAD_URL . $resourceType . '/destroy';

        $postFields = http_build_query([
            'public_id' => $publicId,
            'timestamp' => $timestamp,
            'api_key'   => CLOUDINARY_API_KEY,
            'signature' => $signature,
        ]);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $deleteUrl,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $postFields,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => false, // Evita errores de certificado SSL local en Windows
        ]);

        $response = curl_exec($ch);

        $data = json_decode($response, true);
        return isset($data['result']) && $data['result'] === 'ok';
    }

    /**
     * Extraer el public_id desde una URL de Cloudinary
     */
    public static function extractPublicId(string $url): ?string
    {
        // URL típica: https://res.cloudinary.com/<cloud>/image/upload/v123/<folder>/<name>.jpg
        if (preg_match('/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }
}
