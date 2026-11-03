import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router
} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    const token = localStorage.getItem('token');

    if (!token) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    // Verificar expiración decodificando el payload (sin librerías)
    if (this.isTokenExpired(token)) {
      console.warn('[AuthGuard] Token expirado. Limpiando sesión...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('plaxtilineas_cart');
      return this.router.createUrlTree(['/login'], {
        queryParams: { expired: 'true', returnUrl: state.url }
      });
    }

    return true;
  }

  /**
   * Verifica si el token está expirado.
   *
   * - Tokens JWT (header.payload.signature): decodifica y verifica `exp`.
   * - Tokens opacos de Laravel Sanctum (formato "id|hash"): NO tienen
   *   expiración local. Se retorna false y el servidor valida en /auth/perfil.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');

      // Token opaco (Sanctum): no es JWT → nunca lo marcamos como expirado localmente.
      // El servidor determinará si es válido o no al llamar /auth/perfil.
      if (parts.length !== 3) return false;

      // Base64url → Base64 estándar
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const payload = JSON.parse(atob(padded));

      if (!payload.exp) return false; // Sin exp → no expira

      // exp está en segundos, Date.now() en ms
      const nowSeconds = Math.floor(Date.now() / 1000);
      return payload.exp < nowSeconds;
    } catch {
      // Si el token está malformado, lo tratamos como expirado
      return true;
    }
  }
}
