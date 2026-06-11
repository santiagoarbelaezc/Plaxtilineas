import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { environment } from '../../../enviroments/environment';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';

declare var google: any;

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule
  ],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    ]],
    telefono: ['', [Validators.required, Validators.pattern('^[0-9\\+\\s]{7,15}$')]],
    edad: ['', [Validators.required, Validators.min(18), Validators.max(100)]],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
    ciudad: ['', [Validators.required]]
  });

  mode: 'login' | 'register' = 'login';

  isSubmitting = false;
  showErrorModal = false;
  showPassword = false;
  errorMsg = '';

  // Aviso de sesión expirada
  sessionExpired = false;

  ngOnInit(): void {
    // Detectar si viene redirigido por sesión expirada
    this.route.queryParams.subscribe(params => {
      this.sessionExpired = params['expired'] === 'true';
    });
  }

  ngAfterViewInit(): void {
    this.renderGoogleButton();
  }

  toggleMode(): void {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.errorMsg = '';
    this.showPassword = false;
    // Ya no es necesario volver a renderizar el botón de Google
    // porque su contenedor está fuera del *ngIf y siempre está en el DOM.
  }

  private renderGoogleButton(): void {
    if (typeof google !== 'undefined' && google.accounts && document.getElementById('google-btn-login')) {
      google.accounts.id.initialize({
        client_id: (environment as any).googleClientId || 'AQUI_TU_CLIENT_ID_DE_GOOGLE',
        callback: this.handleGoogleResponse.bind(this)
      });
      const activeTheme = this.themeService.getCurrentTheme();
      google.accounts.id.renderButton(
        document.getElementById('google-btn-login'),
        { 
          theme: activeTheme === 'dark' ? 'filled_black' : 'outline', 
          size: 'large', 
          width: 400, // Google soporta hasta un máximo de 400px
          shape: 'pill', 
          logo_alignment: 'left', 
          text: 'signin_with' 
        }
      );
    }
  }

  private handleGoogleResponse(response: any): void {
    this.isSubmitting = true;
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.redirectUser(res.usuario);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.error || 'Error en inicio de sesión con Google.';
        this.showErrorModal = true;
      }
    });
  }

  private redirectUser(user: any): void {
    if (user && user.rol === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/']);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }

  onSubmit(): void {
    if (this.mode === 'login') {
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        this.errorMsg = 'Por favor, completa todos los campos correctamente.';
        this.showErrorModal = true;
        return;
      }

      this.isSubmitting = true;
      this.sessionExpired = false;
      const { correo, password } = this.loginForm.value;

      this.authService.login(correo, password).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.redirectUser(res.usuario);
        },
        error: () => {
          this.errorMsg = 'Correo o contraseña incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.';
          this.showErrorModal = true;
          this.isSubmitting = false;
        }
      });
    } else {
      if (this.registerForm.invalid) {
        this.registerForm.markAllAsTouched();
        this.errorMsg = 'Por favor, completa todos los campos correctamente.';
        this.showErrorModal = true;
        return;
      }

      this.isSubmitting = true;
      const userData = { ...this.registerForm.value, rol: 'cliente' };

      this.authService.register(userData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.redirectUser(res.usuario);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMsg = err.error?.error || 'Error al registrar. Intenta con otro correo.';
          this.showErrorModal = true;
        }
      });
    }
  }

  get pwdCtrl() { return this.registerForm.get('password'); }
}
