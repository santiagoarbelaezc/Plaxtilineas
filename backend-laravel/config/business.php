<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Reglas y Parámetros de Negocio — Plaxtilineas
    |--------------------------------------------------------------------------
    */

    'costo_envio_cop' => (float) env('COSTO_ENVIO_COP', 10000),

    'iva_porcentaje' => (float) env('IVA_PORCENTAJE', 0.0),

    'reserva_stock_expiracion_minutos' => (int) env('STOCK_RESERVA_EXPIRA_MINUTOS', 180),

    'carrito_expiracion_horas' => (int) env('CARRITO_EXPIRA_HORAS', 3),

    'captcha_expiracion_segundos' => (int) env('CAPTCHA_EXPIRA_SEGUNDOS', 300),

    'token_verificacion_expiracion_horas' => (int) env('TOKEN_VERIFICACION_EXPIRA_HORAS', 24),
];
