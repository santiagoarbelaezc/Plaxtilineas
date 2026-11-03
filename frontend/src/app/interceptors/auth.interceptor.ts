import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor global de autenticación.
 *
 * 1. Adjunta el token JWT a cada petición saliente.
 * 2. Captura errores 401 (token expirado / inválido) y cierra la sesión
 *    de forma limpia redirigiendo al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  // Clonar la petición añadiendo el header Authorization si hay token
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.warn('[AuthInterceptor] Token expirado o inválido. Cerrando sesión...');

        // Limpiar sesión
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirigir al login solo si estamos en una ruta protegida (/admin/*)
        const currentUrl = router.url;
        if (currentUrl.startsWith('/admin')) {
          router.navigate(['/login'], {
            queryParams: { expired: 'true' }
          });
        }
      }

      return throwError(() => error);
    })
  );
};
