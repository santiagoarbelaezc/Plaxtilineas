<?php
require_once __DIR__ . '/../config/config.php';

/**
 * TokenHelper – Tokens HMAC-SHA256 seguros sin librerías externas
 * 
 * Formato del token: base64url(header).base64url(payload).base64url(signature)
 * La firma usa HMAC-SHA256 con TOKEN_SECRET del config.php
 * Es compatible con JWT estándar (HS256) pero sin dependencias externas.
 */
class TokenHelper
{
    /**
     * Generar un token seguro
     *
     * @param array $payload  Datos a incluir (id, correo, rol)
     * @param int   $expiry   Segundos de vigencia (default: TOKEN_EXPIRATION)
     * @return string Token firmado
     */
    public static function encode(array $payload, int $expiry = TOKEN_EXPIRATION): string
    {
        $header = self::base64UrlEncode(json_encode([
            'alg' => 'HS256',
            'typ' => 'TOKEN'
        ]));

        $payload['iat'] = time();
        $payload['exp'] = time() + $expiry;

        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payloadEncoded", TOKEN_SECRET, true)
        );

        return "$header.$payloadEncoded.$signature";
    }

    /**
     * Verificar y decodificar un token
     *
     * @param string $token  El token recibido
     * @return array         Payload decodificado
     * @throws RuntimeException  Si el token es inválido o expiró
     */
    public static function decode(string $token): array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            throw new RuntimeException('Token malformado');
        }

        [$header, $payloadEncoded, $signature] = $parts;

        // Verificar firma
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payloadEncoded", TOKEN_SECRET, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            throw new RuntimeException('Firma del token inválida');
        }

        // Decodificar payload
        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);

        if (!$payload || !isset($payload['exp'])) {
            throw new RuntimeException('Payload del token inválido');
        }

        // Verificar expiración
        if ($payload['exp'] < time()) {
            throw new RuntimeException('Token expirado');
        }

        return $payload;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
