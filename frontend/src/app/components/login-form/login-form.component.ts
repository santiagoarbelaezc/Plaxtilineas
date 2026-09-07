import { Component, inject, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../enviroments/environment';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { ProductosService } from '../../services/productos.service';

declare var google: any;
declare var grecaptcha: any;

export interface SlideItem {
  badge: string;
  title: string;
  subtitle: string;
  image: string;
}

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
    FormsModule,
    HttpClientModule,
    RouterModule
  ],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private productosService = inject(ProductosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  public themeService = inject(ThemeService);

  // Estado del carrusel de imágenes reales
  slides = signal<SlideItem[]>([
    {
      badge: 'MALLAS Y LONAS INDUSTRIALES',
      title: 'Comunidad Plaxtilineas',
      subtitle: '"Ingresa con nosotros para obtener cotizaciones personalizadas y descuentos exclusivos en mallas y lonas."',
      image: 'assets/images/plasticos_malla.jpg'
    },
    {
      badge: 'PROTECCIÓN Y CERRAMIENTOS',
      title: 'Mallas Plásticas & Cafeteras',
      subtitle: '"Soluciones de alta durabilidad para cerramientos agrícolas, secado de café y protección de cultivos."',
      image: 'assets/images/plasticos_industriales_1.png'
    },
    {
      badge: 'INVENTARIO DE ALTA RESISTENCIA',
      title: 'Mallas Hexagonales y Gallinero',
      subtitle: '"Materiales resistentes a la intemperie con envíos rápidos a todo el Quindío y Colombia."',
      image: 'assets/images/plasticos_industriales_2.png'
    },
    {
      badge: 'LONAS Y CUBRIMIENTOS',
      title: 'Lonas Impermeables & Mallas',
      subtitle: '"La mejor calidad en plásticos industriales directamente a tu negocio u obra."',
      image: 'assets/images/banner-materiales.png'
    }
  ]);
  currentSlide = signal(0);
  private autoSlideTimer: any = null;

  loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    captcha_code: ['', [Validators.required]]
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
    ciudad: ['', [Validators.required]],
    captcha_code: ['', [Validators.required]]
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

  // Estado para desplegables personalizados
  isDeptDropdownOpen = false;
  isCityDropdownOpen = false;
  deptSearchFilter = '';
  citySearchFilter = '';

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-container')) {
      this.isDeptDropdownOpen = false;
      this.isCityDropdownOpen = false;
    }
  }

  toggleDeptDropdown(event: Event): void {
    event.stopPropagation();
    this.isDeptDropdownOpen = !this.isDeptDropdownOpen;
    this.isCityDropdownOpen = false;
    this.deptSearchFilter = '';
  }

  toggleCityDropdown(event: Event): void {
    event.stopPropagation();
    if (!this.registerForm.get('departamento')?.value) return;
    this.isCityDropdownOpen = !this.isCityDropdownOpen;
    this.isDeptDropdownOpen = false;
    this.citySearchFilter = '';
  }

  selectDepartamento(dept: string): void {
    this.registerForm.get('departamento')?.setValue(dept);
    this.isDeptDropdownOpen = false;
    this.deptSearchFilter = '';
  }

  selectCiudad(city: string): void {
    this.registerForm.get('ciudad')?.setValue(city);
    this.isCityDropdownOpen = false;
    this.citySearchFilter = '';
  }

  getFilteredDepartamentos(): string[] {
    if (!this.deptSearchFilter.trim()) return this.departamentosList;
    const filterNorm = this.normalizarTexto(this.deptSearchFilter);
    return this.departamentosList.filter(d => this.normalizarTexto(d).includes(filterNorm));
  }

  getFilteredCiudades(): string[] {
    if (!this.citySearchFilter.trim()) return this.ciudadesDisponibles;
    const filterNorm = this.normalizarTexto(this.citySearchFilter);
    return this.ciudadesDisponibles.filter(c => this.normalizarTexto(c).includes(filterNorm));
  }

  private normalizarTexto(str: string): string {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  mode: 'login' | 'register' | 'forgot' = 'login';

  forgotForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, emailDomainValidator()]],
    captcha_code: ['', [Validators.required]]
  });

  changePasswordForm: FormGroup = this.fb.group({
    password: ['', [
      Validators.required, 
      Validators.minLength(8), 
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    ]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  isSubmitting = false;
  showErrorModal = false;
  showConfirmModal = false;
  showSuccessModal = false;
  showPasswordChangeModal = false;
  showPassword = false;
  errorMsg = '';
  successMsg = '';
  userToRedirect: any = null;

  // Aviso de sesión expirada
  sessionExpired = false;

  requireVerification = false;

  captchaId: string = '';
  captchaSvg: SafeHtml = '';

  fetchCaptcha(): void {
    this.authService.getCaptcha().subscribe({
      next: (res) => {
        this.captchaId = res.id;
        this.captchaSvg = this.sanitizer.bypassSecurityTrustHtml(res.svg);
        this.loginForm.get('captcha_code')?.setValue('');
        this.registerForm.get('captcha_code')?.setValue('');
        this.forgotForm.get('captcha_code')?.setValue('');
      },
      error: (err) => {
        console.error('Error al cargar captcha', err);
      }
    });
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    this.fetchCaptcha();
    this.startAutoSlide();
    this.cargarProductosReales();

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

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.stopAutoSlide();
  }

  cargarProductosReales(): void {
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        if (productos && productos.length > 0) {
          const mallasLonas = productos.filter(p => 
            p.imagen_url && 
            (p.nombre.toLowerCase().includes('malla') || 
             p.nombre.toLowerCase().includes('lona') || 
             p.nombre.toLowerCase().includes('polisombra') ||
             p.nombre.toLowerCase().includes('plastico'))
          );

          if (mallasLonas.length > 0) {
            const realSlides: SlideItem[] = mallasLonas.slice(0, 5).map(p => ({
              badge: 'PRODUCTO PLAXTILINEAS',
              title: p.nombre,
              subtitle: p.descripcion ? `"${p.descripcion}"` : '"Encuentra mallas y lonas de alta resistencia con la mejor calidad."',
              image: p.imagen_url
            }));
            this.slides.set(realSlides);
          }
        }
      },
      error: (err) => {
        console.warn('Usando imágenes locales de mallas y lonas para el carrusel de login', err);
      }
    });
  }

  nextSlide(): void {
    this.currentSlide.update(curr => (curr + 1) % this.slides().length);
  }

  prevSlide(): void {
    this.currentSlide.update(curr => (curr - 1 + this.slides().length) % this.slides().length);
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  startAutoSlide(): void {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopAutoSlide(): void {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  ngAfterViewInit(): void {
    this.renderGoogleButton();
  }

  toggleMode(): void {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.errorMsg = '';
    this.showPassword = false;
    this.fetchCaptcha();
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

  async onSubmit(): Promise<void> {
    if (this.mode === 'login') {
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        this.errorMsg = 'Por favor, completa todos los campos correctamente.';
        this.showErrorModal = true;
        return;
      }

      this.isSubmitting = true;
      this.sessionExpired = false;
      const { correo, password, captcha_code } = this.loginForm.value;

      const captchaData = {
        captchaId: this.captchaId,
        captchaCode: captcha_code
      };

      this.authService.login(correo, password, captchaData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.userToRedirect = res.usuario;

          if (res.requiere_cambio_password || res.usuario?.requiere_cambio_password) {
            // Usuario debe cambiar su contraseña temporal obligatoriamente
            this.showPasswordChangeModal = true;
          } else {
            this.successMsg = '¡Ingreso exitoso! Bienvenido a Plaxtilineas.';
            this.showSuccessModal = true;
            const delay = 2700;
            setTimeout(() => {
              if (this.showSuccessModal) {
                this.closeSuccessModal();
              }
            }, delay);
          }
        },
        error: (err) => {
          this.errorMsg = err.error?.error || 'Correo, contraseña o código de seguridad incorrectos. Por favor, verifica e inténtalo de nuevo.';
          this.showErrorModal = true;
          this.isSubmitting = false;
          this.fetchCaptcha();
        }
      });
    } else if (this.mode === 'forgot') {
      this.onSubmitForgot();
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

  onSubmitForgot(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      this.errorMsg = 'Por favor, ingresa tu correo y el código de seguridad correctamente.';
      this.showErrorModal = true;
      return;
    }

    this.isSubmitting = true;
    const { correo, captcha_code } = this.forgotForm.value;

    this.authService.recuperarPassword(correo, this.captchaId, captcha_code).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.errorMsg = '';
        this.mode = 'login';
        this.loginForm.get('correo')?.setValue(correo);
        this.loginForm.get('password')?.setValue('');
        this.fetchCaptcha();

        this.successMsg = res.mensaje || 'Hemos enviado una contraseña temporal a tu correo electrónico. Úsala para ingresar.';
        this.showSuccessModal = true;
        this.userToRedirect = null; // Queda en pantalla de login para digitar la clave temporal
        setTimeout(() => {
          this.showSuccessModal = false;
        }, 4000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.error || 'Error al solicitar la contraseña temporal. Revisa tus datos.';
        this.showErrorModal = true;
        this.fetchCaptcha();
      }
    });
  }

  onSubmitChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      this.errorMsg = 'Por favor, verifica que la nueva contraseña cumpla con los requisitos y coincida en ambos campos.';
      this.showErrorModal = true;
      return;
    }

    this.isSubmitting = true;
    const nuevaPassword = this.changePasswordForm.get('password')?.value;

    this.authService.cambiarPasswordTemporal(nuevaPassword).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.showPasswordChangeModal = false;
        this.successMsg = '¡Tu contraseña ha sido actualizada con éxito!';
        this.showSuccessModal = true;
        const delay = 2500;
        setTimeout(() => {
          if (this.showSuccessModal) {
            this.closeSuccessModal();
          }
        }, delay);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.error || 'Error al actualizar tu contraseña.';
        this.showErrorModal = true;
      }
    });
  }

  async onConfirmRegister(): Promise<void> {
    this.showConfirmModal = false;
    this.isSubmitting = true;
    const { departamento, ciudad, confirmPassword, captcha_code, ...rest } = this.registerForm.value;
    const fullCiudad = `${ciudad}, ${departamento}`;
    const userData = { ...rest, ciudad: fullCiudad, rol: 'cliente' };

    const captchaData = {
      captchaId: this.captchaId,
      captchaCode: captcha_code
    };

    this.authService.register(userData, captchaData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        
        if (res.pendiente_verificacion) {
          this.requireVerification = true;
        } else {
          this.successMsg = '¡Registro exitoso! Bienvenido a Plaxtilineas.';
          this.showSuccessModal = true;
          this.userToRedirect = res.usuario;
          const delay = 2700;
          setTimeout(() => {
            if (this.showSuccessModal) {
              this.closeSuccessModal();
            }
          }, delay);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.error || 'Error al registrar. Intenta con otro correo o verifica el código de seguridad.';
        this.showErrorModal = true;
        this.fetchCaptcha();
      }
    });
  }

  get pwdCtrl() { 
    return this.showPasswordChangeModal 
      ? this.changePasswordForm.get('password') 
      : this.registerForm.get('password'); 
  }

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

  verifyCode(code: string): void {
    if (!code || code.trim().length < 5) {
      this.errorMsg = 'Por favor, ingresa un código válido.';
      this.showErrorModal = true;
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';
    
    this.authService.verificarEmail(code.trim()).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.requireVerification = false;
        
        this.successMsg = '¡Verificación exitosa! Bienvenido a Plaxtilineas.';
        this.showSuccessModal = true;
        this.userToRedirect = res.usuario;
        setTimeout(() => {
          if (this.showSuccessModal) {
            this.closeSuccessModal();
          }
        }, 2700);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.error || 'Código inválido o expirado. Por favor, intenta de nuevo.';
        this.showErrorModal = true;
      }
    });
  }
}
