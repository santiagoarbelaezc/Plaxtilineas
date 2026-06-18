import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faTrash, faExclamationTriangle, faKey } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  mostrarModalConfirmacion = false;
  isDeleting = false;
  errorMessage = '';

  constructor(library: FaIconLibrary) {
    library.addIcons(faTrash, faExclamationTriangle, faKey);
  }

  confirmarEliminacion() {
    this.mostrarModalConfirmacion = true;
    this.errorMessage = '';
  }

  cancelarEliminacion() {
    this.mostrarModalConfirmacion = false;
  }

  eliminarCuenta() {
    this.isDeleting = true;
    this.errorMessage = '';
    
    this.authService.eliminarCuenta().subscribe({
      next: () => {
        this.isDeleting = false;
        this.mostrarModalConfirmacion = false;
        // La cuenta fue eliminada, cerramos la sesión y redirigimos
        this.authService.logout(false);
      },
      error: (err) => {
        this.isDeleting = false;
        this.errorMessage = err.error?.error || 'No se pudo eliminar la cuenta. Por favor, intenta más tarde.';
        console.error('Error al eliminar la cuenta:', err);
      }
    });
  }
}
