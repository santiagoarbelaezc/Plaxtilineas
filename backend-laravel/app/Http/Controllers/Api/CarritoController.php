<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Carrito\SyncCarritoAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Carrito\SyncCarritoRequest;
use App\Models\Usuario;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CarritoController extends Controller
{
    public function __construct(
        protected SyncCarritoAction $syncCarritoAction
    ) {}

    /**
     * GET /api/carrito
     * Obtiene los ítems actuales reservados en el carrito del cliente autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        $items = $usuario->carritos()->get()->map(fn ($c) => [
            'id' => $c->id,
            'producto_id' => (int) $c->producto_id,
            'variante_id' => $c->variante_id !== null ? (int) $c->variante_id : null,
            'cantidad' => (int) $c->cantidad,
            'precio_unitario' => (float) $c->precio_unitario,
            'agregado_en' => $c->created_at?->toIso8601String(),
        ])->values();

        return ApiResponse::success([
            'items' => $items,
        ]);
    }

    /**
     * POST /api/carrito/sync
     * Guarda/sincroniza el carrito actual del cliente autenticado con control de stock.
     */
    public function sync(SyncCarritoRequest $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        Log::info('[CARRITO_CONTROLLER] Petición /api/carrito/sync recibida', [
            'usuario_id' => $usuario->id,
            'usuario_email' => $usuario->correo,
            'items_count' => count($request->getItems()),
        ]);

        $this->syncCarritoAction->execute($usuario, $request->getItems());

        return ApiResponse::success([
            'mensaje' => 'Carrito sincronizado exitosamente.',
        ]);
    }
}
