<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\RolUsuario;
use App\Exceptions\Domain\AccesoNoPermitidoException;
use App\Services\AdminAuditService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function __construct(
        private readonly AdminAuditService $auditService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            throw new AccesoNoPermitidoException('No autenticado.');
        }

        $rol = isset($user->rol) ? (string) $user->rol : '';

        if ($rol !== RolUsuario::ADMIN->value) {
            throw new AccesoNoPermitidoException('Acceso no permitido. Se requieren permisos de administrador.');
        }

        $this->auditService->actualizarActividad($user, $request);

        return $next($request);
    }
}
