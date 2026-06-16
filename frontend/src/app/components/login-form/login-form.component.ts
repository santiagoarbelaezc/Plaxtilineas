import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { environment } from '../../../enviroments/environment';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';

declare var google: any;

export function emailDomainValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    // 1. Debe contener '@'
    if (!value.includes('@')) {
      return { noAtSymbol: true };
    }

    const parts = value.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { invalidFormat: true };
    }

    const domain = parts[1].toLowerCase().trim();

    // 2. Formato del dominio básico
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!domainRegex.test(domain)) {
      return { invalidDomainFormat: true };
    }

    // 3. Typos comunes de correo
    const commonTypos: { [key: string]: string } = {
      'gamil.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmeil.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gmail.con': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gamil.co': 'gmail.com',
      'gmal.co': 'gmail.com',
      'gmeil.co': 'gmail.com',
      'hotmal.com': 'hotmail.com',
      'hormail.com': 'hotmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmaill.com': 'hotmail.com',
      'hotmail.con': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'outluk.com': 'outlook.com',
      'outlook.con': 'outlook.com',
      'outlook.co': 'outlook.com',
      'yaho.com': 'yahoo.com',
      'yahoo.con': 'yahoo.com',
      'yahoo.co': 'yahoo.com'
    };

    if (commonTypos[domain]) {
      return { domainTypo: { correct: commonTypos[domain], current: domain } };
    }

    // Buscar si el nombre principal del dominio tiene typos obvios
    const domainParts = domain.split('.');
    const namePart = domainParts[0];
    const invalidNames = ['gamil', 'gmal', 'gmel', 'gmial', 'outlok', 'outluk', 'hotmal', 'hormail', 'hotmial', 'yaho'];
    if (invalidNames.includes(namePart)) {
      let suggestion = 'gmail.com';
      if (['outlok', 'outluk'].includes(namePart)) suggestion = 'outlook.com';
      if (['hotmal', 'hormail', 'hotmial'].includes(namePart)) suggestion = 'hotmail.com';
      if (namePart === 'yaho') suggestion = 'yahoo.com';
      return { domainTypo: { correct: suggestion, current: domain } };
    }

    return null;
  };
}

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

  private passwordMatchValidator = (g: FormGroup) => {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      g.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      const errors = g.get('confirmPassword')?.errors;
      if (errors) {
        delete errors['mismatch'];
        if (Object.keys(errors).length === 0) {
          g.get('confirmPassword')?.setErrors(null);
        } else {
          g.get('confirmPassword')?.setErrors(errors);
        }
      }
      return null;
    }
  };

  registerForm: FormGroup = this.fb.group({
    nombre: ['', [
      Validators.required, 
      Validators.minLength(2), 
      Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    ]],
    apellidos: ['', [
      Validators.required, 
      Validators.minLength(2), 
      Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    ]],
    correo: ['', [
      Validators.required, 
      Validators.email,
      emailDomainValidator()
    ]],
    password: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    ]],
    confirmPassword: ['', [Validators.required]],
    telefono: ['', [
      Validators.required, 
      Validators.pattern(/^[0-9]{7,10}$/)
    ]],
    edad: ['', [
      Validators.required, 
      Validators.min(0), 
      Validators.max(120),
      Validators.pattern(/^[0-9]+$/)
    ]],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
    departamento: ['', [Validators.required]],
    ciudad: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  departamentos: { [key: string]: string[] } = {
    "Amazonas": ["Leticia", "Puerto Nariño"],
    "Antioquia": ["Medellín", "Bello", "Envigado", "Itagüí", "Rionegro"],
    "Arauca": ["Arauca", "Saravena", "Tame"],
    "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Puerto Colombia"],
    "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona"],
    "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá"],
    "Caldas": ["Manizales", "La Dorada", "Chinchiná", "Villamaría"],
    "Caquetá": ["Florencia", "San Vicente del Caguán", "El Doncello"],
    "Casanare": ["Yopal", "Aguazul", "Villanueva"],
    "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
    "Cesar": ["Valledupar", "Aguachica", "Bosconia"],
    "Chocó": ["Quibdó", "Istmina", "Condoto"],
    "Córdoba": ["Montería", "Cereté", "Lorica", "Sahagún"],
    "Cundinamarca": ["Soacha", "Zipaquirá", "Facatativá", "Chía", "Fusagasugá"],
    "Guainía": ["Inírida"],
    "Guaviare": ["San José del Guaviare", "Calamar"],
    "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia", "Fonseca"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Fundación"],
    "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López"],
    "Nariño": ["Pasto", "Ipiales", "Tumaco", "Túquerres"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario"],
    "Putumayo": ["Mocoa", "Puerto Asís", "Orito"],
    "Quindío": ["Armenia", "Calarcá", "Montenegro", "La Tebaida"],
    "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
    "San Andrés y Providencia": ["San Andrés", "Providencia"],
    "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"],
    "Sucre": ["Sincelejo", "Corozal", "San Marcos"],
    "Tolima": ["Ibagué", "Espinal", "Melgar", "Honda"],
    "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago", "Buga"],
    "Vaupés": ["Mitú"],
    "Vichada": ["Puerto Carreño", "La Primavera"],
    "Bogotá D.C.": ["Bogotá"]
  };

  departamentosList: string[] = Object.keys(this.departamentos);
  ciudadesDisponibles: string[] = [];

  mode: 'login' | 'register' = 'login';

  isSubmitting = false;
  showErrorModal = false;
  showConfirmModal = false;
  showSuccessModal = false;
  showPassword = false;
  errorMsg = '';
  successMsg = '';
  userToRedirect: any = null;

  // Aviso de sesión expirada
  sessionExpired = false;

  ngOnInit(): void {
    // Detectar si viene redirigido por sesión expirada o modo
    this.route.queryParams.subscribe(params => {
      this.sessionExpired = params['expired'] === 'true';
      if (params['mode'] === 'register') {
        this.mode = 'register';
      }
    });

    // Escuchar cambios de departamento para actualizar ciudades
    this.registerForm.get('departamento')?.valueChanges.subscribe(dept => {
      this.ciudadesDisponibles = dept ? (this.departamentos[dept] || []) : [];
      this.registerForm.get('ciudad')?.setValue('');
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
        this.successMsg = '¡Ingreso exitoso con Google! Bienvenido a Plaxtilineas.';
        this.showSuccessModal = true;
        this.userToRedirect = res.usuario;
        const delay = 2700;
        setTimeout(() => {
          if (this.showSuccessModal) {
            this.closeSuccessModal();
          }
        }, delay);
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
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
      this.router.navigateByUrl(returnUrl);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.redirectUser(this.userToRedirect);
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
          this.successMsg = '¡Ingreso exitoso! Bienvenido a Plaxtilineas.';
          this.showSuccessModal = true;
          this.userToRedirect = res.usuario;
          const delay = 2700;
          setTimeout(() => {
            if (this.showSuccessModal) {
              this.closeSuccessModal();
            }
          }, delay);
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

      this.showConfirmModal = true;
    }
  }

  onConfirmRegister(): void {
    this.showConfirmModal = false;
    this.isSubmitting = true;
    const { departamento, ciudad, confirmPassword, ...rest } = this.registerForm.value;
    const fullCiudad = `${ciudad}, ${departamento}`;
    const userData = { ...rest, ciudad: fullCiudad, rol: 'cliente' };

    this.authService.register(userData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMsg = '¡Registro exitoso! Bienvenido a Plaxtilineas.';
        this.showSuccessModal = true;
        this.userToRedirect = res.usuario;
        const delay = 2700;
        setTimeout(() => {
          if (this.showSuccessModal) {
            this.closeSuccessModal();
          }
        }, delay);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.error || 'Error al registrar. Intenta con otro correo.';
        this.showErrorModal = true;
      }
    });
  }

  get pwdCtrl() { return this.registerForm.get('password'); }

  hasMinLength(): boolean {
    const val = this.pwdCtrl?.value || '';
    return val.length >= 8;
  }

  hasUppercase(): boolean {
    const val = this.pwdCtrl?.value || '';
    return /[A-Z]/.test(val);
  }

  hasLowercase(): boolean {
    const val = this.pwdCtrl?.value || '';
    return /[a-z]/.test(val);
  }

  hasNumber(): boolean {
    const val = this.pwdCtrl?.value || '';
    return /\d/.test(val);
  }
}
