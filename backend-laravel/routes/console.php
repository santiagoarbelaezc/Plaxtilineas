<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('carrito:limpiar-expirados')->hourly();
Schedule::command('stock:liberar-expirados')->everyFiveMinutes();
Schedule::command('pedidos:limpiar-expirados')->everyThirtyMinutes();
Schedule::command('wompi:reconciliar-pendientes')->everyTenMinutes();

// Worker de cola para Hostinger: basta con el cron de `schedule:run` cada minuto.
Schedule::command('queue:work --stop-when-empty --max-time=55 --tries=3')
    ->everyMinute()
    ->withoutOverlapping(5);
