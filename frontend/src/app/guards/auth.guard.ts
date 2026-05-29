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
      return this.router.parseUrl('/login');
    }

    // Verificar expiración decodificando el payload (sin librerías)
    if (this.isTokenExpired(token)) {
      console.warn('[AuthGuard] Token expirado. Limpiando sesión...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return this.router.parseUrl('/login?expired=true');
    }

    return true;
  }

  /**
   * Decodifica el payload JWT y verifica el campo `exp`.
   * El token usa el formato estándar base64url(header).base64url(payload).signature
   */
  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

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
