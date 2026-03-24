import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../enviroments/environment';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule // ✅ IMPORTAR AQUÍ TAMBIÉN
  ],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isSubmitting = false;
  showErrorModal = false;
  showPassword = false;
  errorMsg = '';

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMsg = 'Por favor, completa todos los campos correctamente.';
      this.showErrorModal = true;
      return;
    }

    this.isSubmitting = true;
    const { correo, password } = this.loginForm.value;

    this.http.post<{ token: string }>(`${environment.apiUrl}/auth/login`, { correo, password })
      .subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.errorMsg = 'Correo o contraseña incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.';
        this.showErrorModal = true;
        this.isSubmitting = false;
      }
    });
  }
}
