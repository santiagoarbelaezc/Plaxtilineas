<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Reglas y Parámetros de Negocio — Plaxtilineas
    |--------------------------------------------------------------------------
    */

    'costo_envio_cop' => (float) env('COSTO_ENVIO_COP', 10000),

    'envio_compra_minima_cop' => (float) env('ENVIO_COMPRA_MINIMA_COP', 50000),

    'tienda' => [
        'nombre' => (string) env('TIENDA_NOMBRE', 'Plaxtilineas — Sede Principal'),
        'direccion' => (string) env('TIENDA_DIRECCION', 'Cra. 19 #19-35'),
        'ciudad' => (string) env('TIENDA_CIUDAD', 'Armenia'),
        'departamento' => (string) env('TIENDA_DEPARTAMENTO', 'Quindío'),
        'horario' => (string) env('TIENDA_HORARIO', 'Lunes a Viernes 8:00 a.m. - 6:00 p.m. · Sábados 8:00 a.m. - 2:00 p.m.'),
    ],

    'iva_porcentaje' => (float) env('IVA_PORCENTAJE', 0.0),

    'reserva_stock_expiracion_minutos' => (int) env('STOCK_RESERVA_EXPIRA_MINUTOS', 180),

    'pedido_expiracion_minutos' => (int) env('PEDIDO_EXPIRA_MINUTOS', 30),

    'carrito_expiracion_horas' => (int) env('CARRITO_EXPIRA_HORAS', 3),

    'captcha_expiracion_segundos' => (int) env('CAPTCHA_EXPIRA_SEGUNDOS', 300),

    'token_verificacion_expiracion_horas' => (int) env('TOKEN_VERIFICACION_EXPIRA_HORAS', 24),
];
