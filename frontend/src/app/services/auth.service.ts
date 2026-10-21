import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
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
    return !!localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
    if (token) {
      const payload = this.decodeTokenPayload(token);
      if (payload && payload.rol === 'admin') return true;
    }
    return false;
  }

  checkToken(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedIn.next(true);
      const payload = this.decodeTokenPayload(token);
      if (payload && !this.currentUser.value) {
        this.currentUser.next(payload);
      }
      this.http.get(`${environment.apiUrl}/auth/perfil`).subscribe({
        next: (user) => this.currentUser.next(user),
        error: () => this.logout()
      });
    } else {
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
          this.isLoggedIn.next(true);
          this.currentUser.next(res.usuario);
          this.checkToken();
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
          this.isLoggedIn.next(true);
          this.currentUser.next(res.usuario);
          this.checkToken();
        }
      })
    );
  }

  verificarEmail(token: string): Observable<any> {
    return this.http.get<{ token: string, usuario: any }>(`${environment.apiUrl}/auth/verificar-email`, {
      params: { token }
    }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.isLoggedIn.next(true);
          this.currentUser.next(res.usuario);
          this.checkToken();
        }
      })
    );
  }

  loginWithGoogle(credential: string): Observable<any> {
    return this.http.post<{ token: string, usuario: any }>(`${environment.apiUrl}/auth/google`, { credential }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.isLoggedIn.next(true);
          this.currentUser.next(res.usuario);
          this.checkToken();
        }
      })
    );
  }

  logout(showAnimation = true): void {
    if (showAnimation) {
      this.isLoggingOut.next(true);
      setTimeout(() => {
        this.performLogout();
      }, 2500);
    } else {
      this.performLogout();
    }
  }

  private performLogout(): void {
    localStorage.removeItem('token');
    this.isLoggedIn.next(false);
    this.currentUser.next(null);
    this.isLoggingOut.next(false);
    this.router.navigate(['/']);
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
          this.currentUser.next(res.usuario);
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
}
