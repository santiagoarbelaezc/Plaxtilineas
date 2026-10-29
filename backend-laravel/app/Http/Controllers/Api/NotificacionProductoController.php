<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Notificaciones\NotificarProductoNuevoAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Notificaciones\ProductoNuevoRequest;
use App\Models\Usuario;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * Endpoints:
 *   POST /api/notificaciones/producto-nuevo   (firma HMAC del catálogo)
 *   GET  /api/notificaciones/baja/{token}     (baja de novedades en 1 clic)
 */
class NotificacionProductoController extends Controller
{
    public function __construct(
        private readonly NotificarProductoNuevoAction $action,
    ) {}

    public function productoNuevo(ProductoNuevoRequest $request): JsonResponse
    {
        if (! (bool) config('services.catalogo.notificaciones_activas', true)) {
            return ApiResponse::success([
                'aceptada' => false,
                'mensaje' => 'Notificaciones desactivadas.',
            ], 202);
        }

        $resultado = $this->action->execute($request->producto());

        if ($resultado['duplicada']) {
            return ApiResponse::success([
                'aceptada' => false,
                'duplicada' => true,
                'mensaje' => 'Este producto ya fue notificado.',
            ], 200);
        }

        return ApiResponse::success([
            'aceptada' => true,
            'notificacion_id' => $resultado['notificacion']->id,
            'mensaje' => 'Notificación en proceso de envío.',
        ], 202);
    }

    public function baja(string $token): Response
    {
        $usuario = strlen($token) >= 32
            ? Usuario::query()->where('token_baja', $token)->first()
            : null;

        if ($usuario === null) {
            return response($this->pagina('Enlace no válido', 'Este enlace de baja no es válido o ya expiró.'), 404)
                ->header('Content-Type', 'text/html; charset=UTF-8');
        }

        // Query Builder directo: el esquema legado de `usuarios` puede no tener `updated_at`.
        DB::table('usuarios')->where('id', $usuario->id)->update(['acepta_novedades' => false]);

        return response($this->pagina(
            'Listo, no recibirás más novedades',
            'Ya no te enviaremos correos de productos nuevos. Puedes volver a activarlos desde tu perfil cuando quieras.'
        ))->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function pagina(string $titulo, string $mensaje): string
    {
        $titulo = htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8');
        $mensaje = htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8');

        return "<!doctype html><html lang='es'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>{$titulo}</title></head>"
            ."<body style='margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#334155;'>"
            ."<div style='max-width:480px;margin:80px auto;padding:36px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;text-align:center;'>"
            ."<div style='font-size:13px;font-weight:800;letter-spacing:3px;color:#16a34a;'>PLAXTILINEAS</div>"
            ."<h1 style='font-size:22px;color:#0f172a;margin:20px 0 10px;'>{$titulo}</h1>"
            ."<p style='color:#64748b;line-height:1.6;margin:0;'>{$mensaje}</p></div></body></html>";
    }
}

