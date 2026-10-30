<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Pedidos\LimpiarPedidosExpiradosAction;
use Illuminate\Console\Command;

final class LimpiarPedidosExpiradosCommand extends Command
{
    protected $signature = 'pedidos:limpiar-expirados';

    protected $description = 'Elimina pedidos no confirmados después de 30 minutos y libera sus reservas de stock.';

    public function handle(LimpiarPedidosExpiradosAction $action): int
    {
        $resultado = $action->execute();

        $this->info(sprintf(
            'Limpieza completada: %d pedidos eliminados y %d reservas liberadas.',
            $resultado['pedidos_eliminados'],
            $resultado['reservas_liberadas']
        ));

        return self::SUCCESS;
    }
}
