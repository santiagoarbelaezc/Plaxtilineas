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
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.isLoggedIn.next(false);
    this.currentUser.next(null);
    this.router.navigate(['/']);
  }
}
