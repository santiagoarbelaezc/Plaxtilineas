import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { WompiService } from '../../services/wompi.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, Footer, SocialButtonsComponent],
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.css']
})
export class CartSummaryComponent implements OnInit {
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private authService = inject(AuthService);
  private wompiSvc = inject(WompiService);
  private router = inject(Router);
  private configuracionService = inject(ConfiguracionService);
  
  items = toSignal(this.cartService.items$, { initialValue: [] });
  isLoggedIn = signal(false);
  wompiEnabled = signal(true);

  ngOnInit() {
    this.authService.isLoggedIn.subscribe(val => {
      this.isLoggedIn.set(val);
    });
    this.configuracionService.wompiEnabled$.subscribe(val => {
      this.wompiEnabled.set(val);
    });
  }
  
  totalCount = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });

  subtotal = computed(() => {
    return this.cartService.getSubtotal();
  });

  costoEnvio = computed(() => {
    return this.cartService.getCostoEnvio();
  });

  totalPrice = computed(() => {
    return this.cartService.getTotalFinal();
  });

  showCheckoutModal = signal(false);
  showAuthModal = signal(false);
  showCaptchaModal = signal(false);
  isSubmitting = signal(false);
  checkoutError = signal<string | null>(null);

  private sanitizer = inject(DomSanitizer);

  captchaId: string = '';
  captchaSvg: SafeHtml = '';

  checkoutData = {
    direccion_envio: '',
    ciudad: '',
    departamento: '',
    telefono_contacto: '',
    metodo_pago: 'wompi',
    notas: '',
    captcha_code: ''
  };

  increaseQuantity(id: string, current: number) {
    this.cartService.updateQuantity(id, current + 1);
  }

  decreaseQuantity(id: string, current: number) {
    if (current > 1) {
      this.cartService.updateQuantity(id, current - 1);
    }
  }

  removeItem(id: string) {
    if (confirm('¿Deseas eliminar este producto del carrito?')) {
      this.cartService.removeFromCart(id);
    }
  }

  clearCart() {
    if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
      this.cartService.clearCart();
    }
  }

  goBack(): void {
    window.history.back();
  }

  iniciarCheckout(): void {
    if (!this.authService.isLoggedIn.getValue()) {
      this.showAuthModal.set(true);
      return;
    }

    // Auto-completar datos con la información del registro del usuario
    const user = this.authService.currentUser.getValue();
    if (user) {
      if (user.direccion) {
        this.checkoutData.direccion_envio = user.direccion;
      }
      if (user.telefono) {
        this.checkoutData.telefono_contacto = user.telefono;
      }
      if (user.ciudad) {
        const parts = user.ciudad.split(',');
        if (parts.length > 1) {
          this.checkoutData.ciudad = parts[0].trim();
          this.checkoutData.departamento = parts[1].trim();
        } else {
          this.checkoutData.ciudad = user.ciudad.trim();
        }
      }
    }

    this.fetchCaptcha();
    this.showCaptchaModal.set(true);
  }

  confirmarCaptcha(): void {
    if (!this.checkoutData.captcha_code) return;
    this.showCaptchaModal.set(false);
    this.checkoutError.set(null); // Limpiar errores anteriores
    this.showCheckoutModal.set(true);
  }

  closeCaptchaModal(): void {
    this.showCaptchaModal.set(false);
  }

  fetchCaptcha(): void {
    this.authService.getCaptcha().subscribe({
      next: (res) => {
        this.captchaId = res.id;
        this.captchaSvg = this.sanitizer.bypassSecurityTrustHtml(res.svg);
        this.checkoutData.captcha_code = '';
      },
      error: (err) => {
        console.error('Error al cargar captcha', err);
      }
    });
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  navigateToLogin(): void {
    this.closeAuthModal();
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
  }

  navigateToRegister(): void {
    this.closeAuthModal();
    this.router.navigate(['/login'], { queryParams: { mode: 'register', returnUrl: '/carrito' } });
  }

  closeCheckout(): void {
    this.showCheckoutModal.set(false);
    this.checkoutError.set(null);
  }

  isAtMaxStock(item: any): boolean {
    return this.cartService.isAtMaxStock(item);
  }

  contactarAsesorWhatsApp(): string {
    const items = this.items();
    let mensaje = `👋 *Hola, necesito asesoría para mi compra en Plaxtilineas*\n\n`;
    mensaje += `*Detalle de mi carrito:*\n`;
    items.forEach(item => {
      const nombre = item.producto.nombre;
      const detalle = item.variante ? item.variante.nombre : (item.producto.subcategoria || 'General');
      mensaje += `🔹 *${nombre}* (${detalle})\n`;
      mensaje += `   Cantidad: ${item.cantidad} | Subtotal: ${this.formatearPrecio(item.precioUnitario * item.cantidad)}\n\n`;
    });
    mensaje += `💰 *Valor Total Estimado:* ${this.formatearPrecio(this.totalPrice())}\n\n`;
    mensaje += `¿Me podrían ayudar con unas dudas que tengo para finalizar mi pedido? ¡Muchas gracias!`;
    return `https://wa.me/573007365939?text=${encodeURIComponent(mensaje)}`;
  }

  generarMensajeWhatsApp(orderId?: number): string {
    const items = this.items();
    let mensaje = `🛒 *Nuevo Pedido desde Plaxtilineas${orderId ? ` (#` + orderId + ')' : ''}*\n\n`;
    mensaje += `*Datos de Envío:*\n`;
    mensaje += `• *Dirección:* ${this.checkoutData.direccion_envio}\n`;
    mensaje += `• *Ciudad:* ${this.checkoutData.ciudad} - ${this.checkoutData.departamento}\n`;
    mensaje += `• *Teléfono:* ${this.checkoutData.telefono_contacto}\n`;
    mensaje += `• *Método de pago:* ${this.checkoutData.metodo_pago === 'contraentrega' ? 'Contraentrega (Pago al recibir)' : 'Transferencia Bancaria'}\n`;
    if (this.checkoutData.notas) {
      mensaje += `• *Notas:* ${this.checkoutData.notas}\n`;
    }
    mensaje += `\n*Productos:*\n`;
    items.forEach(item => {
      const nombre = item.variante ? `${item.producto.nombre} (${item.variante.nombre})` : item.producto.nombre;
      mensaje += `• ${nombre} x${item.cantidad} — ${this.formatearPrecio(item.precioUnitario * item.cantidad)}\n`;
    });
    mensaje += `\n*Total: ${this.formatearPrecio(this.totalPrice())}*\n\n`;
    mensaje += `Quedo atento a la confirmación. ¡Gracias!`;
    return mensaje;
  }

  confirmarPedido(): void {
    if (this.isSubmitting()) return;
    
    this.isSubmitting.set(true);
    this.checkoutError.set(null);

    const itemsPayload = this.items().map(i => ({
      producto_id: i.producto.id,
      variante_id: i.variante?.id,
      cantidad: i.cantidad
    }));

    // Primero verificamos el stock en backend
    this.cartService.verificarStockEnBackend(itemsPayload).subscribe({
      next: (stockRes) => {
        if (!stockRes.valido) {
          this.isSubmitting.set(false);
          const errores = stockRes.items_con_error.map((err: any) => `${err.nombre || 'Producto'}: ${err.error}`).join(', ');
          this.checkoutError.set(`Error de stock: ${errores}`);
          return;
        }

        // Crear draft o pedido en backend
        const draftPayload = {
          items:              itemsPayload,
          direccion_envio:    this.checkoutData.direccion_envio,
          ciudad:             this.checkoutData.ciudad,
          departamento:       this.checkoutData.departamento || undefined,
          telefono_contacto:  this.checkoutData.telefono_contacto,
          notas:              this.checkoutData.notas || undefined,
          metodo_pago:        this.checkoutData.metodo_pago,
          wompi_desarrollo:   !this.wompiEnabled(),
          captchaId:          this.captchaId,
          captchaCode:        this.checkoutData.captcha_code
        };

        this.pedidoService.crearDraft(draftPayload).subscribe({
          next: (draft) => {
            if (this.checkoutData.metodo_pago === 'wompi') {
              if (!this.wompiEnabled()) {
                // Wompi desactivado: mostrar pantalla de mantenimiento
                this.isSubmitting.set(false);
                this.cartService.clearCart();
                this.closeCheckout();
                this.router.navigate(['/pago-desarrollo'], { state: { pedido: draft } });
                return;
              }

              // Obtener firma de Wompi del backend
              this.wompiSvc.obtenerDatosPago(draft.pedido_id).subscribe({
                next: (datos) => {
                  this.isSubmitting.set(false);
                  this.closeCheckout();
                  // Redirigir a la pantalla de pago premium
                  this.router.navigate(['/pago'], {
                    state: {
                      datosPago: datos,
                      datosEnvio: {
                        direccion:    this.checkoutData.direccion_envio,
                        ciudad:       this.checkoutData.ciudad,
                        departamento: this.checkoutData.departamento,
                        telefono:     this.checkoutData.telefono_contacto,
                      }
                    }
                  });
                },
                error: (_err) => {
                  this.isSubmitting.set(false);
                  this.checkoutError.set('Error al conectar con la pasarela de pago. Intenta de nuevo.');
                }
              });

            } else {
              // Contraentrega o Transferencia: Confirmación offline directa
              this.isSubmitting.set(false);
              this.cartService.clearCart();
              this.closeCheckout();
              
              // Redirigir a la pantalla de pago asistido
              this.router.navigate(['/pago-asistido'], { 
                state: { 
                  pedido: { codigo_pedido: draft.codigo_pedido }, 
                  metodo: this.checkoutData.metodo_pago 
                } 
              });
            }
          },
          error: (err) => {
            this.isSubmitting.set(false);
            const errorMessage = err.error?.error || 'Ocurrió un error al procesar tu solicitud.';
            this.checkoutError.set(errorMessage);
            
            // Si el error es por captcha, devolvemos al modal de captcha
            if (errorMessage.toLowerCase().includes('captcha')) {
               this.showCheckoutModal.set(false);
               this.fetchCaptcha();
               this.showCaptchaModal.set(true);
            }
          }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.checkoutError.set('Error al verificar stock. Intenta de nuevo.');
      }
    });
  }

  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${precioFormateado}`;
  }
}
