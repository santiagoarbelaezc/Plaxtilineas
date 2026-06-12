import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, Footer],
  templateUrl: './verificar-email.html',
  styleUrls: ['./verificar-email.css']
})
export class VerificarEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  status: 'formulario' | 'cargando' | 'exito' | 'error' = 'formulario';
  codigo = '';
  errorMessage = '';

  ngOnInit(): void {
    window.scrollTo(0, 0);
    
    // Si viene un token/código en la URL, auto-procesar
    const token = this.route.snapshot.queryParamMap.get('token') || this.route.snapshot.queryParamMap.get('codigo');
    if (token) {
      this.codigo = token;
      this.verificar(token);
    }
  }

  onSubmitCode(): void {
    const cleanCodigo = this.codigo.trim();
    if (cleanCodigo.length !== 6 || isNaN(Number(cleanCodigo))) {
      this.errorMessage = 'El código debe tener exactamente 6 dígitos numéricos.';
      this.status = 'error';
      return;
    }

    this.verificar(cleanCodigo);
  }

  verificar(code: string): void {
    this.status = 'cargando';
    this.authService.verificarEmail(code).subscribe({
      next: (res) => {
        this.status = 'exito';
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      },
      error: (err) => {
        this.status = 'error';
        this.errorMessage = err.error?.error || 'El código de verificación ingresado no es válido o ha expirado.';
      }
    });
  }

  intentarDeNuevo(): void {
    this.status = 'formulario';
    this.errorMessage = '';
    this.codigo = '';
  }
}
