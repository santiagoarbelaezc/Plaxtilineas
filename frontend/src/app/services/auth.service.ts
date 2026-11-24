import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, retry, tap } from 'rxjs';
import { environment } from '../../enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Estado global de autenticación
  public isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  public currentUser = new BehaviorSubject<any>(null);
  public isLoggingOut = new BehaviorSubject<boolean>(false);

  constructor() {
    this.checkToken();
  }

  public hasToken(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const token = localStorage.getItem('token');
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Verifica de forma síncrona si el usuario cuenta con una sesión activa y vigente.
   */
  public isAuthenticated(): boolean {
    return this.hasToken() && this.isLoggedIn.getValue();
  }

  public isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      // Token opaco de Laravel Sanctum (formato "id|hash") no tiene exp local
      if (parts.length !== 3) return false;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const payload = JSON.parse(atob(padded));

      if (!payload.exp) return false;
      const nowSeconds = Math.floor(Date.now() / 1000);
      return payload.exp < nowSeconds;
    } catch {
      return true;
    }
  }

  public decodeTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      return JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch (e) {
      return null;
    }
  }

  public isAdmin(): boolean {
    const user = this.currentUser.value;
    if (user && user.rol === 'admin') return true;
    if (typeof localStorage === 'undefined') return false;
    const token = localStorage.getItem('token');
    if (token) {
      const payload = this.decodeTokenPayload(token);
      if (payload && payload.rol === 'admin') return true;
    }
    return false;
  }

  private saveUserToStorage(user: any): void {
    if (!user || typeof localStorage === 'undefined') return;
    try {
      const prevRaw = localStorage.getItem('user');
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      const merged = { ...prev, ...user };
      localStorage.setItem('user', JSON.stringify(merged));
      this.currentUser.next(merged);
    } catch {
      this.currentUser.next(user);
    }
  }

  obtenerPerfil(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/perfil`).pipe(
      retry(1),
      tap((user) => this.saveUserToStorage(user))
    );
  }

  checkToken(): void {
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem('token');
    if (token && !this.isTokenExpired(token)) {
      this.isLoggedIn.next(true);

      // Hidratar inmediatamente desde localStorage para evitar campos vacíos ante latencia o 504
      try {
        const cachedUserRaw = localStorage.getItem('user');
        if (cachedUserRaw && !this.currentUser.value) {
          this.currentUser.next(JSON.parse(cachedUserRaw));
        }
      } catch {
        // Ignorar JSON inválido en caché local
      }

      const payload = this.decodeTokenPayload(token);
      if (payload && !this.currentUser.value) {
        this.currentUser.next(payload);
      }

      this.obtenerPerfil().subscribe({
        error: (err) => {
          // Solo cerrar sesión si el token fue rechazado (401); nunca en un 504 Gateway Timeout
          if (err?.status === 401) {
            this.logout(false);
          }
        }
      });
    } else {
      if (token) {
        localStorage.removeItem('token');
      }
      localStorage.removeItem('user');
      localStorage.removeItem('plaxtilineas_cart');
      this.isLoggedIn.next(false);
      this.currentUser.next(null);
    }
  }

  getCaptcha(): Observable<{ id: string; svg: string }> {
    return this.http.get<{ id: string; svg: string }>(`${environment.apiUrl}/auth/captcha`);
  }

  recuperarPassword(correo: string, captchaId: string, captchaCode: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/recuperar-password`, {
      correo,
      captchaId,
      captchaCode
    });
  }

  cambiarPasswordTemporal(nuevaPassword: string): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.post(`${environment.apiUrl}/auth/cambiar-password-temporal`, {
      nueva_password: nuevaPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  login(correo: string, password: string): Observable<any> {
    const payload = { 
      correo, 
      password
    };
    return this.http.post<{ token: string, usuario: any }>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.saveUserToStorage(res.usuario);
          this.isLoggedIn.next(true);
        }
      })
    );
  }

  register(userData: any, captchaData?: { captchaId: string; captchaCode: string }): Observable<any> {
    const payload = { 
      ...userData, 
      captchaId: captchaData?.captchaId,
      captchaCode: captchaData?.captchaCode 
    };
    return this.http.post<{ token?: string, usuario?: any, pendiente_verificacion?: boolean }>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap(res => {
        if (res.token && !res.pendiente_verificacion) {
          localStorage.setItem('token', res.token);
          this.saveUserToStorage(res.usuario);
          this.isLoggedIn.next(true);
        }
      })
    );
  }

  verificarEmail(token: string, correo?: string): Observable<any> {
    const params: Record<string, string> = { token };
    const correoPendiente = correo?.trim() || localStorage.getItem('plaxtilineas_pending_verification_email') || '';
    if (correoPendiente) {
      params['correo'] = correoPendiente;
    }

    return this.http.get<{ token: string, usuario: any }>(`${environment.apiUrl}/auth/verificar-email`, {
      params
    }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.saveUserToStorage(res.usuario);
          this.isLoggedIn.next(true);
        }
        localStorage.removeItem('plaxtilineas_pending_verification_email');
      })
    );
  }

  loginWithGoogle(credential: string): Observable<any> {
    return this.http.post<{ token: string, usuario: any }>(`${environment.apiUrl}/auth/google`, { credential }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.saveUserToStorage(res.usuario);
          this.isLoggedIn.next(true);
        }
      })
    );
  }

  logout(showAnimation = true): void {
    if (showAnimation && this.isLoggingOut.value) return;

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && showAnimation) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        error: () => {
          // Ignorar errores de red al cerrar sesión
        }
      });
    }

    if (showAnimation) {
      this.isLoggingOut.next(true);
      setTimeout(() => {
        this.performLogout();
      }, 2400);
    } else {
      this.performLogout();
    }
  }

  private performLogout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('plaxtilineas_cart');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('plaxtilineas_pending_cart_action');
    }
    this.isLoggedIn.next(false);
    this.currentUser.next(null);
    this.router.navigate(['/']).finally(() => {
      this.isLoggingOut.next(false);
    });
  }

  actualizarPerfil(userData: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    return this.http.put<{ mensaje: string, usuario: any }>(`${environment.apiUrl}/auth/actualizar`, userData, { headers }).pipe(
      tap(res => {
        if (res.usuario) {
          this.saveUserToStorage(res.usuario);
        }
      })
    );
  }

  eliminarCuenta(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    return this.http.delete<{ mensaje: string }>(`${environment.apiUrl}/auth/cuenta`, { headers });
  }

  obtenerEstadoLimitePassword(): Observable<{
    limite_password: {
      usados: number;
      maximo: number;
      restantes: number;
      ventana_dias: number;
      permitido: boolean;
      proximo_disponible_en: string | null;
      dias_restantes: number;
    };
  }> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    return this.http.get<{
      limite_password: {
        usados: number;
        maximo: number;
        restantes: number;
        ventana_dias: number;
        permitido: boolean;
        proximo_disponible_en: string | null;
        dias_restantes: number;
      };
    }>(`${environment.apiUrl}/auth/password/estado`, { headers });
  }

  solicitarCodigoCambioPassword(): Observable<{ mensaje: string; correo_enmascarado: string; expira_minutos: number; cooldown_segundos?: number }> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    return this.http.post<{ mensaje: string; correo_enmascarado: string; expira_minutos: number; cooldown_segundos?: number }>(
      `${environment.apiUrl}/auth/password/solicitar-codigo`,
      {},
      { headers }
    );
  }

  validarCodigoCambioPassword(codigo: string): Observable<{ valido: boolean; mensaje: string }> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    return this.http.post<{ valido: boolean; mensaje: string }>(
      `${environment.apiUrl}/auth/password/validar-codigo`,
      { codigo },
      { headers }
    );
  }

  actualizarPasswordConCodigo(payload: {
    codigo: string;
    nueva_password: string;
    nueva_password_confirmation: string;
  }): Observable<{
    mensaje: string;
    limite_password?: {
      usados: number;
      maximo: number;
      restantes: number;
      ventana_dias: number;
      permitido: boolean;
      proximo_disponible_en: string | null;
      dias_restantes: number;
    };
  }> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    return this.http.post<{
      mensaje: string;
      limite_password?: {
        usados: number;
        maximo: number;
        restantes: number;
        ventana_dias: number;
        permitido: boolean;
        proximo_disponible_en: string | null;
        dias_restantes: number;
      };
    }>(
      `${environment.apiUrl}/auth/password/actualizar`,
      payload,
      { headers }
    );
  }
}
