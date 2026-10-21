<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Carrito\SyncCarritoAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Carrito\SyncCarritoRequest;
use App\Models\Usuario;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CarritoController extends Controller
{
    public function __construct(
        protected SyncCarritoAction $syncCarritoAction
    ) {}

    /**
     * POST /api/carrito/sync
     * Guarda/sincroniza el carrito actual del cliente autenticado con control de stock.
     */
    public function sync(SyncCarritoRequest $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        \Illuminate\Support\Facades\Log::info('[CARRITO_CONTROLLER] Petición /api/carrito/sync recibida', [
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
