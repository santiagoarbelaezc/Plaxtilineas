import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faTrash, faExclamationTriangle, faKey, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';

export interface LimitePasswordEstado {
  usados: number;
  maximo: number;
  restantes: number;
  ventana_dias: number;
  permitido: boolean;
  proximo_disponible_en: string | null;
  dias_restantes: number;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  @Input() isEmbedded = false;
  private authService = inject(AuthService);

  // Estado: Cambio de contraseña con código OTP
  codigoEnviado = signal(false);
  codigoValidado = signal(false);
  enviandoCodigo = signal(false);
  validandoCodigo = signal(false);
  actualizandoPassword = signal(false);
  correoEnmascarado = signal('');
  cooldownSegundos = signal(0);
  passwordError = signal('');
  passwordInfo = signal('');
  mostrarModalExitoPassword = signal(false);
  limitePassword = signal<LimitePasswordEstado | null>(null);
  cargandoLimite = signal(false);

  codigoOtp = '';
  nuevaPassword = '';
  confirmarPassword = '';
  mostrarNuevaPassword = false;
  mostrarConfirmarPassword = false;

  // Estado: Zona de peligro (Eliminar cuenta)
  mostrarModalConfirmacion = false;
  isDeleting = false;
  errorMessage = '';

  private cooldownTimer: any = null;

  constructor(library: FaIconLibrary) {
    library.addIcons(faTrash, faExclamationTriangle, faKey, faShieldAlt);
  }

  ngOnInit(): void {
    this.cargarEstadoLimitePassword();
  }

  ngOnDestroy(): void {
    this.detenerCooldown();
  }

  get puedeCambiarPassword(): boolean {
    const estado = this.limitePassword();
    return estado ? estado.permitido : true;
  }

  get fechaProximoCambioFormateada(): string {
    const iso = this.limitePassword()?.proximo_disponible_en;
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  cargarEstadoLimitePassword(): void {
    this.cargandoLimite.set(true);
    this.authService.obtenerEstadoLimitePassword().subscribe({
      next: (res) => {
        this.cargandoLimite.set(false);
        if (res?.limite_password) {
          this.limitePassword.set(res.limite_password);
        }
      },
      error: () => {
        this.cargandoLimite.set(false);
      }
    });
  }

  get correoUsuario(): string {
    return this.authService.currentUser.getValue()?.correo || '';
  }

  // Validaciones en vivo de contraseña segura
  get reqMinLength(): boolean {
    return this.nuevaPassword.length >= 8;
  }

  get reqUppercase(): boolean {
    return /[A-Z]/.test(this.nuevaPassword);
  }

  get reqLowercase(): boolean {
    return /[a-z]/.test(this.nuevaPassword);
  }

  get reqNumber(): boolean {
    return /[0-9]/.test(this.nuevaPassword);
  }

  get reqSpecial(): boolean {
    return /[^a-zA-Z0-9]/.test(this.nuevaPassword);
  }

  get reqMatch(): boolean {
    return this.nuevaPassword.length > 0 && this.nuevaPassword === this.confirmarPassword;
  }

  get codigoValido(): boolean {
    return /^\d{6}$/.test(this.codigoOtp.trim());
  }

  get formularioPasswordValido(): boolean {
    return (
      this.codigoValidado() &&
      this.codigoValido &&
      this.reqMinLength &&
      this.reqUppercase &&
      this.reqLowercase &&
      this.reqNumber &&
      this.reqSpecial &&
      this.reqMatch
    );
  }

  onCodigoInput(val: string): void {
    this.codigoOtp = val.replace(/\D/g, '').slice(0, 6);
    if (this.passwordError()) this.passwordError.set('');
  }

  solicitarCodigo(): void {
    if (!this.puedeCambiarPassword || this.enviandoCodigo() || this.cooldownSegundos() > 0) return;

    this.enviandoCodigo.set(true);
    this.passwordError.set('');
    this.passwordInfo.set('');

    this.authService.solicitarCodigoCambioPassword().subscribe({
      next: (res) => {
        this.enviandoCodigo.set(false);
        this.codigoEnviado.set(true);
        this.codigoValidado.set(false);
        this.codigoOtp = '';
        this.correoEnmascarado.set(res.correo_enmascarado || this.correoUsuario);
        this.passwordInfo.set(
          res.mensaje || 'Enviamos un código de 6 dígitos a tu correo electrónico.'
        );
        this.iniciarCooldown(res.cooldown_segundos || 60);
      },
      error: (err) => {
        this.enviandoCodigo.set(false);
        const msg =
          err?.error?.error ||
          err?.error?.message ||
          'No pudimos enviar el código a tu correo. Intenta nuevamente.';
        this.passwordError.set(msg);
      }
    });
  }

  validarCodigo(): void {
    if (!this.codigoValido || this.validandoCodigo()) return;

    this.validandoCodigo.set(true);
    this.passwordError.set('');

    this.authService.validarCodigoCambioPassword(this.codigoOtp.trim()).subscribe({
      next: (res) => {
        this.validandoCodigo.set(false);
        this.codigoValidado.set(true);
        this.passwordInfo.set(
          res.mensaje || 'Código verificado correctamente. Ahora puedes establecer tu nueva contraseña.'
        );
      },
      error: (err) => {
        this.validandoCodigo.set(false);
        this.codigoValidado.set(false);
        const msg =
          err?.error?.error ||
          err?.error?.message ||
          'El código ingresado no es válido o ya expiró.';
        this.passwordError.set(msg);
      }
    });
  }

  actualizarPassword(): void {
    if (!this.formularioPasswordValido || this.actualizandoPassword()) return;

    this.actualizandoPassword.set(true);
    this.passwordError.set('');

    this.authService
      .actualizarPasswordConCodigo({
        codigo: this.codigoOtp.trim(),
        nueva_password: this.nuevaPassword,
        nueva_password_confirmation: this.confirmarPassword
      })
      .subscribe({
        next: (res) => {
          this.actualizandoPassword.set(false);
          if (res?.limite_password) {
            this.limitePassword.set(res.limite_password);
          } else {
            this.cargarEstadoLimitePassword();
          }
          this.resetFormularioPassword();
          this.mostrarModalExitoPassword.set(true);
        },
        error: (err) => {
          this.actualizandoPassword.set(false);
          const firstValidationError = err?.error?.errors
            ? (Object.values(err.error.errors).flat()[0] as string)
            : '';
          const msg =
            err?.error?.error ||
            firstValidationError ||
            err?.error?.message ||
            'No se pudo actualizar la contraseña. Verifica el código e intenta de nuevo.';
          this.passwordError.set(msg);
        }
      });
  }

  cerrarModalExitoPassword(): void {
    this.mostrarModalExitoPassword.set(false);
  }

  cancelarCambioPassword(): void {
    this.resetFormularioPassword();
  }

  private resetFormularioPassword(): void {
    this.codigoEnviado.set(false);
    this.codigoValidado.set(false);
    this.validandoCodigo.set(false);
    this.codigoOtp = '';
    this.nuevaPassword = '';
    this.confirmarPassword = '';
    this.passwordError.set('');
    this.passwordInfo.set('');
    this.mostrarNuevaPassword = false;
    this.mostrarConfirmarPassword = false;
    this.detenerCooldown();
  }

  private iniciarCooldown(segundos: number): void {
    this.detenerCooldown();
    this.cooldownSegundos.set(segundos);
    this.cooldownTimer = setInterval(() => {
      const next = this.cooldownSegundos() - 1;
      if (next <= 0) {
        this.detenerCooldown();
      } else {
        this.cooldownSegundos.set(next);
      }
    }, 1000);
  }

  private detenerCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.cooldownSegundos.set(0);
  }

  // Zona de Peligro
  confirmarEliminacion(): void {
    this.mostrarModalConfirmacion = true;
    this.errorMessage = '';
  }

  cancelarEliminacion(): void {
    this.mostrarModalConfirmacion = false;
  }

  eliminarCuenta(): void {
    this.isDeleting = true;
    this.errorMessage = '';

    this.authService.eliminarCuenta().subscribe({
      next: () => {
        this.isDeleting = false;
        this.mostrarModalConfirmacion = false;
        this.authService.logout(false);
      },
      error: (err) => {
        this.isDeleting = false;
        this.errorMessage =
          err.error?.error || 'No se pudo eliminar la cuenta. Por favor, intenta más tarde.';
      }
    });
  }
}
