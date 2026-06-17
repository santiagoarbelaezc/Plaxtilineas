import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  checkToken(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedIn.next(true);
      this.http.get(`${environment.apiUrl}/auth/perfil`).subscribe({
        next: (user) => this.currentUser.next(user),
        error: () => this.logout()
      });
    } else {
      this.isLoggedIn.next(false);
      this.currentUser.next(null);
    }
  }

  login(correo: string, password: string): Observable<any> {
    return this.http.post<{ token: string, usuario: any }>(`${environment.apiUrl}/auth/login`, { correo, password }).pipe(
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

  register(userData: any): Observable<any> {
    return this.http.post<{ token?: string, usuario?: any }>(`${environment.apiUrl}/auth/register`, userData).pipe(
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
}
