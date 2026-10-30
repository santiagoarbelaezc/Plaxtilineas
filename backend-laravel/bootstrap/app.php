<?php

declare(strict_types=1);

use App\Exceptions\Domain\DomainException;
use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\VerificarFirmaCatalogo;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(append: [
            AssignRequestId::class,
        ]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'catalogo.firma' => VerificarFirmaCatalogo::class,
            'request.id' => AssignRequestId::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e): bool {
            return $request->is('api/*') || $request->expectsJson();
        });

        // 1. ValidationException -> 422 con formato estándar de la API
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                /** @var string $firstError */
                $firstError = $e->validator->errors()->first();

                return response()->json([
                    'error' => $firstError !== '' ? $firstError : 'Los datos enviados no son válidos.',
                    'errors' => $e->validator->errors()->toArray(),
                ], 422, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        });

        // 2. AuthenticationException -> 401
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'error' => 'No autenticado.',
                ], 401, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        });

        // 3. AuthorizationException & AccessDeniedHttpException -> 403
        $exceptions->render(function (AuthorizationException|AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'error' => 'Acceso denegado.',
                ], 403, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        });

        // 4. ModelNotFoundException -> 404
        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'error' => 'Recurso no encontrado.',
                ], 404, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        });

        // 5. NotFoundHttpException (rutas no existentes bajo /api/*) -> 404
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'error' => 'Ruta no encontrada.',
                ], 404, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        });

        // 6. ThrottleRequestsException -> 429
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $retryAfter = $e->getHeaders()['Retry-After'] ?? 60;

                return response()->json([
                    'error' => "Demasiadas peticiones. Intenta de nuevo en {$retryAfter} segundos.",
                ], 429, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        });

        // 7. DomainException -> httpStatus() específico del dominio
        $exceptions->render(function (DomainException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $payload = array_merge(['error' => $e->getMessage()], $e->context());

                return response()->json(
                    $payload,
                    $e->httpStatus(),
                    [],
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                );
            }
        });

        // 8. HttpExceptionInterface (BadRequest, NotFound, etc.)
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = $e->getStatusCode();
                $msg = $e->getMessage();
                if ($msg === '') {
                    $msg = match ($status) {
                        404 => 'Ruta no encontrada.',
                        403 => 'Acceso denegado.',
                        default => 'Petición inválida.',
                    };
                }

                return response()->json([
                    'error' => $msg,
                ], $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        });

        // 8. Fallback general para Throwable bajo /api/* -> 500
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                Log::error('Error no capturado en API: '.$e->getMessage(), [
                    'exception' => $e,
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                ]);

                $payload = ['error' => 'Error interno del servidor'];
                if (config('app.debug')) {
                    $payload['detalle'] = $e->getMessage();
                }

                return response()->json(
                    $payload,
                    500,
                    [],
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                );
            }
        });
    })->create();
