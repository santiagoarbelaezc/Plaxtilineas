import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
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
  private authService = inject(AuthService);
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

  showAuthModal = signal(false);

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
    this.router.navigate(['/pago']);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  navigateToLogin(): void {
    this.closeAuthModal();
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/pago' } });
  }

  navigateToRegister(): void {
    this.closeAuthModal();
    this.router.navigate(['/login'], { queryParams: { mode: 'register', returnUrl: '/pago' } });
  }

  isAtMaxStock(item: any): boolean {
    return this.cartService.isAtMaxStock(item);
  }

  getDisponible(item: any): number | null {
    return this.cartService.getDisponible(item);
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



  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${precioFormateado}`;
  }
}
