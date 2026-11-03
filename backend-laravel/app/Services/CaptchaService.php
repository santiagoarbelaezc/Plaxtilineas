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

        $width = 150;
        $height = 48;

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'.$width.'" height="'.$height.'" viewBox="0 0 '.$width.' '.$height.'" style="border-radius: 50px; font-family: \'Montserrat\', sans-serif;">';
        $svg .= '<defs>';
        $svg .= '<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">';
        $svg .= '<stop offset="0%" stop-color="#0a0e17"/>';
        $svg .= '<stop offset="100%" stop-color="#141a28"/>';
        $svg .= '</linearGradient>';
        $svg .= '<pattern id="meshGrid" width="10" height="10" patternUnits="userSpaceOnUse">';
        $svg .= '<path d="M 10 0 L 0 0 0 10" fill="none" stroke="#2a3346" stroke-width="0.75" opacity="0.4"/>';
        $svg .= '</pattern>';
        $svg .= '</defs>';

        $svg .= '<rect width="100%" height="100%" fill="url(#bgGrad)" rx="12" />';
        $svg .= '<rect width="100%" height="100%" fill="url(#meshGrid)" rx="12" />';

        $colors = ['#ffffff', '#94a3b8', '#64748b', '#cbd5e1'];
        for ($i = 0; $i < 5; $i++) {
            $x1 = random_int(0, $width);
            $y1 = random_int(0, $height);
            $x2 = random_int(0, $width);
            $y2 = random_int(0, $height);
            $stroke = $colors[$i % count($colors)];
            $svg .= '<line x1="'.$x1.'" y1="'.$y1.'" x2="'.$x2.'" y2="'.$y2.'" stroke="'.$stroke.'" stroke-width="1.2" opacity="0.3"/>';
        }

        $textColors = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#f1f5f9'];
        $fonts = ['Montserrat', 'Impact', 'Trebuchet MS', 'Arial Black', 'Verdana'];
        for ($i = 0; $i < strlen($text); $i++) {
            $char = $text[$i];
            $fontSize = 25 + random_int(0, 5);
            $angle = -14 + random_int(0, 28);
            $x = 18 + $i * 27 + random_int(0, 3);
            $y = 34 + random_int(0, 4);
            $font = $fonts[random_int(0, count($fonts) - 1)];
            $color = $textColors[$i % count($textColors)];

            $svg .= '<text x="'.$x.'" y="'.$y.'" font-family="'.$font.'" font-size="'.$fontSize.'" font-weight="900" fill="'.$color.'" transform="rotate('.$angle.', '.$x.', '.$y.')" opacity="0.95" letter-spacing="1">'.htmlspecialchars($char, ENT_QUOTES, 'UTF-8').'</text>';
        }

        for ($i = 0; $i < 30; $i++) {
            $cx = random_int(0, $width);
            $cy = random_int(0, $height);
            $dotColor = $colors[random_int(0, count($colors) - 1)];
            $svg .= '<circle cx="'.$cx.'" cy="'.$cy.'" r="1" fill="'.$dotColor.'" opacity="0.4"/>';
        }

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
