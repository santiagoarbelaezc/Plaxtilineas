import { Component, OnInit, inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faUser, faPhone, faTimes, faPaperPlane, faCheckCircle, faEnvelope, faLock, faMapMarkerAlt, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { animate, style, transition, trigger } from '@angular/animations';
import { LeadsService } from '../../services/leads.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../enviroments/environment';

declare var google: any;

@Component({
  selector: 'app-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './registration-modal.component.html',
  styleUrls: ['./registration-modal.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUpIn', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class RegistrationModalComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);
  private leadsService = inject(LeadsService);
  private authService = inject(AuthService);
  
  isVisible = false;
  registrationForm: FormGroup;
  isSubmitting = false;
  registroExitoso = false;
  requireVerification = false;
  errorMessage = '';
  showPassword = false;

  constructor(library: FaIconLibrary) {
    library.addIcons(faUser, faPhone, faTimes, faPaperPlane, faCheckCircle, faEnvelope, faLock, faMapMarkerAlt, faCalendarAlt);
    
    // Validación más robusta recomendada
    this.registrationForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/) // Min 8, mayuscula, minuscula, numero
      ]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9\\+\\s]{7,15}$')]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(100)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      ciudad: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.checkAndShowModal();
      
      this.leadsService.showRegistrationModal$.subscribe(() => {
        this.isVisible = true;
        this.renderGoogleButton();
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.isVisible && isPlatformBrowser(this.platformId)) {
      this.renderGoogleButton();
    }
  }

  private renderGoogleButton(): void {
    setTimeout(() => {
      if (typeof google !== 'undefined' && google.accounts && document.getElementById('google-btn')) {
        google.accounts.id.initialize({
          client_id: environment.googleClientId || 'AQUI_TU_CLIENT_ID_DE_GOOGLE', // Debe estar en environment
          callback: this.handleGoogleCredentialResponse.bind(this)
        });
        google.accounts.id.renderButton(
          document.getElementById('google-btn'),
          { theme: 'outline', size: 'large', width: '100%' }
        );
      }
    }, 500);
  }

  private handleGoogleCredentialResponse(response: any): void {
    this.isSubmitting = true;
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.requireVerification = false;
        this.registroExitoso = true;
        this.leadsService.markAsRegistered();
        setTimeout(() => this.closeModal(), 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'Error en inicio de sesión con Google.';
      }
    });
  }

  private checkAndShowModal(): void {
    // Si ya está autenticado, no mostrar
    if (this.authService.isLoggedIn.value) return;

    this.leadsService.registered$.subscribe(isRegistered => {
      if (!isRegistered) {
        setTimeout(() => {
          if (!localStorage.getItem('registrationModalShown')) {
            this.isVisible = true;
            this.renderGoogleButton();
          }
        }, 1500);
      } else {
        this.isVisible = false;
      }
    });
  }

  closeModal(): void {
    this.isVisible = false;
    localStorage.setItem('registrationModalShown', 'true');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';
      
      // Añadimos rol cliente por defecto y pasamos toda la data
      const userData = {
        ...this.registrationForm.value,
        rol: 'cliente'
      };
      
      this.authService.register(userData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.requireVerification = res.pendiente_verificacion || false;
          this.registroExitoso = true;
          this.leadsService.markAsRegistered();
          
          const timeoutDelay = this.requireVerification ? 6000 : 2000;
          setTimeout(() => {
            this.closeModal();
          }, timeoutDelay);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.error?.error || 'Ocurrió un error al registrar. Por favor intenta de nuevo.';
          console.error('Error al registrar usuario:', err);
        }
      });
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }

  // Getters para validaciones
  get pwdCtrl() { return this.registrationForm.get('password'); }
}
