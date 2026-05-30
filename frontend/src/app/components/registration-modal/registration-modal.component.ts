import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faUser, faPhone, faTimes, faPaperPlane, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { animate, style, transition, trigger } from '@angular/animations';
import { LeadsService } from '../../services/leads.service';

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
export class RegistrationModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);
  private leadsService = inject(LeadsService);
  
  isVisible = false;
  registrationForm: FormGroup;
  isSubmitting = false;
  registroExitoso = false;
  errorMessage = '';

  constructor(library: FaIconLibrary) {
    library.addIcons(faUser, faPhone, faTimes, faPaperPlane, faCheckCircle);
    this.registrationForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9\\+\\s]{7,15}$')]]
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.checkAndShowModal();
    }
  }

  private checkAndShowModal(): void {
    // Solo mostrar si no lo han registrado todavía en esta sesión
    const yaRegistrado = localStorage.getItem('plaxtilineas_lead_registered');
    setTimeout(() => {
      this.isVisible = true;
    }, 1500);
  }

  closeModal(): void {
    this.isVisible = false;
    localStorage.setItem('registrationModalShown', 'true');
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';
      
      const { fullName, phone } = this.registrationForm.value;
      
      this.leadsService.registrarLead(fullName, phone, 'modal_bienvenida').subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          this.registroExitoso = true;
          localStorage.setItem('plaxtilineas_lead_registered', 'true');
          setTimeout(() => {
            this.closeModal();
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.error?.error || 'Ocurrió un error al registrar. Por favor intenta de nuevo.';
          console.error('Error al registrar lead:', err);
        }
      });
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }
}
