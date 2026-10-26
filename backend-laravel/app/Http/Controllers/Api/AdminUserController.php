<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\RolUsuario;
use App\Http\Controllers\Controller;
use App\Models\Usuario;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;

class AdminUserController extends Controller
{
    /**
     * GET /api/admin/usuarios-detalle
     */
    public function obtenerUsuariosDetalle(\App\Services\Catalogo\CatalogoApiService $catalogo): JsonResponse
    {
        /** @var Collection<int, Usuario> $usuarios */
        $usuarios = Usuario::query()
            ->where('rol', '!=', RolUsuario::ADMIN->value)
            ->with([
                'pedidos' => fn ($q) => $q->orderBy('fecha', 'desc'),
                'carritos',
            ])
            ->orderBy('nombre', 'asc')
            ->get();

        $data = $usuarios->map(function (Usuario $u) use ($catalogo) {
            $pedidosValidos = $u->pedidos->where('estado.value', '!=', 'cancelado');
            $totalCompras = (float) $pedidosValidos->sum('total');
            $cantidadPedidos = $pedidosValidos->count();

            $pedidos = $u->pedidos->map(fn ($p) => [
                'id' => $p->id,
                'codigo_pedido' => $p->codigo_pedido,
                'fecha' => $p->created_at?->toIso8601String(),
                'total' => (float) $p->total,
                'estado' => $p->estado->value,
            ])->values();

            $carrito = $u->carritos->map(function ($c) use ($catalogo) {
                $p = $catalogo->getProducto((int) $c->producto_id);
                return [
                    'id' => $c->id,
                    'producto_id' => $c->producto_id,
                    'cantidad' => $c->cantidad,
                    'precio_unitario' => (float) $c->precio_unitario,
                    'producto_nombre' => $p['name'] ?? "Producto #{$c->producto_id}",
                    'imagen_url' => $p['images'][0]['url'] ?? null,
                ];
            })->values();

            return [
                'id' => $u->id,
                'nombre' => $u->nombre,
                'apellidos' => $u->apellidos,
                'correo' => $u->correo,
                'edad' => $u->edad,
                'direccion' => $u->direccion,
                'ciudad' => $u->ciudad,
                'rol' => $u->rol,
                'email_verificado' => (bool) $u->email_verificado,
                'estado_verificacion' => $u->email_verificado ? 'verificado' : 'pendiente_verificacion',
                'total_compras' => $totalCompras,
                'cantidad_pedidos' => $cantidadPedidos,
                'pedidos' => $pedidos,
                'carrito' => $carrito,
            ];
        });

        return ApiResponse::success($data->toArray());
    }

    /**
     * DELETE /api/admin/usuarios/:id
     */
    public function eliminarUsuario(int $id): JsonResponse
    {
        /** @var Usuario|null $usuario */
        $usuario = Usuario::query()->find($id);

        if (! $usuario) {
            return ApiResponse::error('Usuario no encontrado.', 404);
        }

        if ($usuario->isAdmin()) {
            return ApiResponse::error('No se pueden eliminar administradores.', 403);
        }

        // Verificar si tiene pedidos activos pendientes (cancelado, entregado y draft no bloquean)
        $tienePedidosActivos = $usuario->pedidos()
            ->whereNotIn('estado', ['cancelado', 'entregado', 'draft'])
            ->exists();

        if ($tienePedidosActivos) {
            return ApiResponse::error('No se puede eliminar el usuario porque tiene pedidos activos en proceso.', 400);
        }

        $usuario->tokens()->delete();
        $usuario->delete();

        return ApiResponse::success([
            'mensaje' => 'Usuario eliminado correctamente.',
        ]);
    }
}
