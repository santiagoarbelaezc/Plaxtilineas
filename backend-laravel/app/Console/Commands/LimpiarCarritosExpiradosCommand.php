<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Carrito\LimpiarCarritosExpiradosAction;
use Illuminate\Console\Command;

class LimpiarCarritosExpiradosCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'carrito:limpiar-expirados';

    /**
     * @var string
     */
    protected $description = 'Limpia carritos inactivos con más de 24 horas y devuelve su stock al inventario';

    public function handle(LimpiarCarritosExpiradosAction $action): int
    {
        $this->info('Limpiando carritos expirados...');

        $total = $action->execute();

        $this->info("Proceso finalizado. Total de items eliminados: {$total}");

        return self::SUCCESS;
    }
}
