import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faUser, faPhone, faTimes, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { animate, style, transition, trigger } from '@angular/animations';

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
  
  isVisible = false;
  registrationForm: FormGroup;
  isSubmitting = false;

  constructor(library: FaIconLibrary) {
    library.addIcons(faUser, faPhone, faTimes, faPaperPlane);
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
    const isMobile = window.innerWidth < 768;
    const hasBeenShown = localStorage.getItem('registrationModalShown');

    if (isMobile && !hasBeenShown) {
      // Delay slightly for better UX (let the app load first)
      setTimeout(() => {
        this.isVisible = true;
      }, 1500);
    }
  }

  closeModal(): void {
    this.isVisible = false;
    localStorage.setItem('registrationModalShown', 'true');
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isSubmitting = true;
      
      // Simulating API call
      console.log('Registrando lead:', this.registrationForm.value);
      
      setTimeout(() => {
        this.isSubmitting = false;
        this.closeModal();
      }, 1000);
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }
}
