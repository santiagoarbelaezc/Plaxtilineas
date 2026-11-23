<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Captcha;
use Illuminate\Support\Facades\Hash;

class CaptchaService
{
    /**
     * Genera la imagen SVG vectorial con patrón de malla y texto distorsionado de alta seguridad.
     * Replica exactamente la lógica de generateCaptcha() del PHP legacy.
     *
     * @return array{id: string, svg: string}
     */
    public function generate(): array
    {
        // 1. Limpiar captchas vencidos al vuelo
        Captcha::query()->where('expires_at', '<', now())->delete();

        $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $text = '';
        $len = strlen($characters);
        for ($i = 0; $i < 5; $i++) {
            $text .= $characters[random_int(0, $len - 1)];
        }

        $width = 164;
        $height = 48;

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'.$width.'" height="'.$height.'" viewBox="0 0 '.$width.' '.$height.'" style="display: block; font-family: \'Montserrat\', \'Courier New\', monospace;">';
        $svg .= '<defs>';
        $svg .= '<linearGradient id="monoBg" x1="0%" y1="0%" x2="100%" y2="100%">';
        $svg .= '<stop offset="0%" stop-color="#0d0d0f"/>';
        $svg .= '<stop offset="100%" stop-color="#18181b"/>';
        $svg .= '</linearGradient>';
        $svg .= '<pattern id="monoGrid" width="12" height="12" patternUnits="userSpaceOnUse">';
        $svg .= '<path d="M 12 0 L 0 0 0 12" fill="none" stroke="#27272a" stroke-width="0.7" opacity="0.65"/>';
        $svg .= '</pattern>';
        $svg .= '</defs>';

        $svg .= '<rect width="100%" height="100%" fill="url(#monoBg)" rx="8" />';
        $svg .= '<rect width="100%" height="100%" fill="url(#monoGrid)" rx="8" />';

        // Líneas de interferencia monocromáticas sutiles
        $lineShades = ['#3f3f46', '#52525b', '#71717a', '#27272a'];
        for ($i = 0; $i < 5; $i++) {
            $x1 = random_int(0, $width);
            $y1 = random_int(0, $height);
            $x2 = random_int(0, $width);
            $y2 = random_int(0, $height);
            $stroke = $lineShades[$i % count($lineShades)];
            $svg .= '<line x1="'.$x1.'" y1="'.$y1.'" x2="'.$x2.'" y2="'.$y2.'" stroke="'.$stroke.'" stroke-width="1" opacity="0.5"/>';
        }

        // Caracteres monocromáticos nítidos de alto contraste
        $textShades = ['#ffffff', '#f4f4f5', '#e4e4e7', '#fafafa', '#d4d4d8'];
        for ($i = 0; $i < strlen($text); $i++) {
            $char = $text[$i];
            $fontSize = 24 + random_int(0, 4);
            $angle = -11 + random_int(0, 22);
            $x = 20 + $i * 29 + random_int(-2, 2);
            $y = 33 + random_int(-2, 3);
            $color = $textShades[$i % count($textShades)];

            $svg .= '<text x="'.$x.'" y="'.$y.'" font-family="Montserrat, Courier New, monospace" font-size="'.$fontSize.'" font-weight="800" fill="'.$color.'" transform="rotate('.$angle.', '.$x.', '.$y.')" opacity="0.96" letter-spacing="1.5">'.htmlspecialchars($char, ENT_QUOTES, 'UTF-8').'</text>';
        }

        // Micro-puntos monocromáticos anti-OCR
        for ($i = 0; $i < 24; $i++) {
            $cx = random_int(4, $width - 4);
            $cy = random_int(4, $height - 4);
            $dotColor = $lineShades[random_int(0, count($lineShades) - 1)];
            $svg .= '<circle cx="'.$cx.'" cy="'.$cy.'" r="1" fill="'.$dotColor.'" opacity="0.55"/>';
        }

        $svg .= '<rect x="0.75" y="0.75" width="'.($width - 1.5).'" height="'.($height - 1.5).'" fill="none" stroke="#27272a" stroke-width="1.2" rx="7.5" />';
        $svg .= '</svg>';

        $id = bin2hex(random_bytes(16));
        $expiresAt = now()->addSeconds((int) config('business.captcha_expiracion_segundos', 300));
        $hashedCode = Hash::make(strtolower(trim($text)));

        Captcha::query()->create([
            'id' => $id,
            'codigo' => $hashedCode,
            'expires_at' => $expiresAt,
        ]);

        return [
            'id' => $id,
            'svg' => $svg,
        ];
    }

    /**
     * Valida y consume (de un solo uso) el código de captcha.
     */
    public function verifyAndConsume(?string $id, ?string $code): bool
    {
        if (! $id || ! $code) {
            return false;
        }

        // Limpiar vencidos
        Captcha::query()->where('expires_at', '<', now())->delete();

        $captcha = Captcha::query()->where('id', $id)->first();
        if (! $captcha) {
            return false;
        }

        // Eliminación inmediata para garantizar uso único
        $captcha->delete();

        return Hash::check(strtolower(trim($code)), $captcha->codigo);
    }
}
