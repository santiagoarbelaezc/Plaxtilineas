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

        return $this->deleteUnpaidPedido($pedido);
    }

    /**
     * Elimina un pedido no pagado desde la administración.
     *
     * @return array<string, string>
     */
    public function executeForAdmin(int $pedidoId): array
    {
        /** @var Pedido|null $pedido */
        $pedido = Pedido::find($pedidoId);

        if (! $pedido) {
            throw new NotFoundHttpException('Pedido no encontrado.');
        }

        return $this->deleteUnpaidPedido($pedido);
    }

    /**
     * @return array<string, string>
     */
    private function deleteUnpaidPedido(Pedido $pedido): array
    {
        $noEliminables = [
            EstadoPedido::PAGADO,
            EstadoPedido::CONFIRMADO,
            EstadoPedido::EN_PREPARACION,
            EstadoPedido::EN_CAMINO,
            EstadoPedido::ENTREGADO,
        ];

        DB::transaction(function () use ($pedido, $noEliminables) {
            /** @var Pedido|null $pedidoLocked */
            $pedidoLocked = Pedido::where('id', $pedido->id)->lockForUpdate()->first();
            if (! $pedidoLocked) {
                return;
            }

            if (in_array($pedidoLocked->estado, $noEliminables, true)) {
                throw new BadRequestHttpException('No puedes eliminar un pedido que ya ha sido pagado o procesado.');
            }

            // Solo liberar stock si el pedido NO estaba ya cancelado
            // (si ya estaba cancelado, el stock ya fue restituido al cancelarlo)
            if ($pedidoLocked->estado !== EstadoPedido::CANCELADO) {
                $this->liberarStockReservaAction->execute($pedidoLocked);
            }
            $pedidoLocked->items()->delete();
            $pedidoLocked->delete();
        });

        return ['mensaje' => 'Pedido eliminado correctamente.'];
    }
}
