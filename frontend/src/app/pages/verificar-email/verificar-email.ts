import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, Footer],
  templateUrl: './verificar-email.html',
  styleUrls: ['./verificar-email.css']
})
export class VerificarEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  status: 'cargando' | 'exito' | 'error' = 'cargando';
  errorMessage = '';

  ngOnInit(): void {
    window.scrollTo(0, 0);
    
    // Obtener el token de la URL
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (!token) {
      this.status = 'error';
      this.errorMessage = 'El enlace de verificación no contiene un token válido.';
      return;
    }

    // Llamar al servicio de autenticación para verificar el email
    this.authService.verificarEmail(token).subscribe({
      next: (res) => {
        this.status = 'exito';
        // Redirigir al inicio después de 4 segundos
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 4000);
      },
      error: (err) => {
        this.status = 'error';
        this.errorMessage = err.error?.error || 'No se pudo verificar el correo electrónico. El enlace puede haber expirado o ser inválido.';
      }
    });
  }
}
