<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Exceptions\Domain\AccesoNoPermitidoException;
use App\Models\Pedido;
use App\Models\Usuario;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class CancelarPedidoAction
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

        $noCancelables = [
            EstadoPedido::PAGADO,
            EstadoPedido::CONFIRMADO,
            EstadoPedido::EN_PREPARACION,
            EstadoPedido::EN_CAMINO,
            EstadoPedido::ENTREGADO,
        ];

        if (in_array($pedido->estado, $noCancelables, true)) {
            throw new BadRequestHttpException('No puedes cancelar un pedido que ya ha sido pagado o procesado.');
        }

        if ($pedido->estado === EstadoPedido::CANCELADO) {
            throw new BadRequestHttpException('El pedido ya está cancelado.');
        }

        DB::transaction(function () use ($pedido) {
            $pedido->update([
                'estado' => EstadoPedido::CANCELADO,
            ]);

            $this->liberarStockReservaAction->execute($pedido);
        });

        return ['mensaje' => 'Pedido cancelado correctamente.'];
    }
}
