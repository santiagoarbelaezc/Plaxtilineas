<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\ReconcilePendingPaymentsJob;
use Illuminate\Console\Command;

final class ReconciliarPagosWompiCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'wompi:reconciliar-pendientes {--minutes=10 : Minutos de antigüedad mínima para pedidos en pendiente_pago}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reconcilia pedidos en pendiente_pago consultando directamente la API de Wompi por si no llegó el webhook.';

    public function handle(): int
    {
        $minutes = (int) $this->option('minutes');
        if ($minutes < 1) {
            $minutes = 10;
        }

        $this->info("Iniciando reconciliación de pagos pendientes de Wompi (antigüedad > {$minutes} min)...");

        // Ejecutamos el Job de forma síncrona en el comando
        ReconcilePendingPaymentsJob::dispatchSync($minutes);

        $this->info('Reconciliación de Wompi completada.');

        return self::SUCCESS;
    }
}
