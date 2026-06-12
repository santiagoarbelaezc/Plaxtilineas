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
    departamento: ['', [Validators.required]],
    ciudad: ['', [Validators.required]]
  });

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
  showPassword = false;
  errorMsg = '';

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
      const { departamento, ciudad, ...rest } = this.registerForm.value;
      const fullCiudad = `${ciudad}, ${departamento}`;
      const userData = { ...rest, ciudad: fullCiudad, rol: 'cliente' };

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
