<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Exceptions\Domain\AccesoNoPermitidoException;
use App\Models\Pedido;
use App\Models\StockReserva;
use App\Models\Usuario;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class EliminarPedidoAction
{
    public function __construct(
        private readonly LiberarStockReservaAction $liberarStockReservaAction
    ) {}

    /**
     * @return array<string, string>
     */
    public function execute(int $pedidoId, Usuario $user): array
    {
        /** @var Pedido|null $pedido */
        $pedido = Pedido::find($pedidoId);

        if (! $pedido) {
            throw new NotFoundHttpException('Pedido no encontrado.');
        }

        if ($pedido->usuario_id !== $user->id) {
            throw new AccesoNoPermitidoException('No autorizado.');
        }

        $noEliminables = [
            EstadoPedido::PAGADO,
            EstadoPedido::CONFIRMADO,
            EstadoPedido::EN_PREPARACION,
            EstadoPedido::EN_CAMINO,
            EstadoPedido::ENTREGADO,
        ];

        if (in_array($pedido->estado, $noEliminables, true)) {
            throw new BadRequestHttpException('No puedes eliminar un pedido que ya ha sido pagado o procesado.');
        }

        DB::transaction(function () use ($pedido) {
            $this->liberarStockReservaAction->execute($pedido);
            $pedido->items()->delete();
            $pedido->delete();
        });


        return ['mensaje' => 'Pedido eliminado correctamente.'];
    }
}
