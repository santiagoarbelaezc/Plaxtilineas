import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-white flex flex-col font-sans mb-10" style="padding-top: calc(var(--navbar-height) + 40px);">
      
      <div class="w-full max-w-[1400px] mx-auto px-4 md:px-8 xl:px-16">
        
        <!-- Header -->
        <div class="mb-10 flex items-center gap-3 border-b border-black pb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-black">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <h1 class="text-3xl font-extrabold text-black uppercase tracking-wide m-0">Finalizar Compra</h1>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12">
          
          <!-- Columna Izquierda: Los Productos -->
          <div class="flex flex-col gap-5">
            
            <div class="bg-white border border-gray-200 p-0 flex flex-col rounded-sm">
              <div class="p-6 border-b border-gray-200 bg-gray-50/50">
                <h2 class="text-lg font-bold text-black uppercase m-0 tracking-wider">
                  Tus Productos ({{ totalCount() }})
                </h2>
              </div>
              
              <div class="flex flex-col">
                @if (items().length === 0) {
                  <div class="py-16 flex flex-col items-center justify-center text-center">
                    <svg class="mb-4 text-gray-300" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    <p class="text-gray-500 font-medium text-lg">No hay productos en tu carrito.</p>
                    <a routerLink="/productos" class="mt-6 px-8 py-3 bg-black text-white font-bold uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors rounded-sm no-underline">Ir a la tienda</a>
                  </div>
                } @else {
                  @for (item of items(); track item.id; let last = $last) {
                    <!-- Item -->
                    <div class="grid grid-cols-[120px_1fr_auto] gap-6 items-center p-6 transition-all relative" [class.border-b]="!last" [class.border-gray-200]="!last">
                      <div class="bg-[#f9f9f9] border border-gray-200 rounded-sm w-[120px] h-[120px] flex items-center justify-center shrink-0">
                        @if (item.producto.imagen_url) {
                          <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" class="w-full h-full object-contain p-2 mix-blend-multiply">
                        } @else {
                          <svg class="text-gray-300 w-10 h-10" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        }
                      </div>
                      
                      <div class="flex flex-col gap-2">
                        <h3 class="text-lg font-bold text-black uppercase m-0 leading-tight">{{ item.producto.nombre }}</h3>
                        <p class="text-sm text-gray-500 m-0 font-medium">
                          {{ item.variante ? item.variante.nombre : (item.producto.subcategoria || 'Genérico') }} 
                          <span class="mx-2">|</span> {{ item.producto.unidad || 'Unidades' }}
                        </p>
                        <div class="mt-1 flex items-center gap-4">
                          <span class="text-sm text-gray-500 font-medium">C/U: {{ formatearPrecio(item.precioUnitario) }}</span>
                        </div>
                      </div>
                      
                      <div class="flex flex-col items-end gap-4 justify-center">
                        <div class="text-[22px] font-extrabold text-black">{{ formatearPrecio(item.precioUnitario * item.cantidad) }}</div>
                        <div class="flex items-center gap-0 border border-black rounded-sm overflow-hidden">
                          <button 
                            (click)="decreaseQuantity(item.id, item.cantidad)"
                            class="w-10 h-10 bg-white border-r border-black flex items-center justify-center text-black hover:bg-gray-100 transition-colors cursor-pointer text-xl font-light">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                          <span class="w-12 text-center font-bold text-black">{{ item.cantidad }}</span>
                          <button 
                            (click)="increaseQuantity(item.id, item.cantidad)"
                            class="w-10 h-10 bg-white border-l border-black flex items-center justify-center text-black hover:bg-gray-100 transition-colors cursor-pointer text-xl font-light">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                        </div>
                      </div>
                      
                      <button (click)="removeItem(item.id)" class="absolute right-6 top-6 text-gray-400 hover:text-black transition-colors p-2 cursor-pointer bg-transparent border-none rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  }
                }
              </div>
            </div>

          </div>

          <!-- Columna Derecha: Tarjeta de Resumen / Checkout Fija -->
          <div class="flex flex-col">
            <div class="bg-white border border-gray-200 rounded-sm p-8 flex flex-col sticky top-[calc(var(--navbar-height)+40px)]">
              <h2 class="text-xl font-bold text-black uppercase mb-6 m-0 border-b border-black pb-4 tracking-wider">
                Resumen
              </h2>
              
              <div class="flex flex-col gap-4 text-gray-600 mb-8 font-medium">
                <div class="flex justify-between items-center text-[15px]">
                  <span>Subtotal ({{ totalCount() }} items)</span>
                  <span class="text-black font-bold">{{ formatearPrecio(totalPrice()) }}</span>
                </div>
                
                <div class="flex justify-between items-center text-[15px]">
                  <span>Envío estimado</span>
                  <span class="text-gray-500 font-medium">A calcular</span>
                </div>
                
                <div class="flex justify-between items-center text-[15px]">
                  <span>Impuestos (IVA)</span>
                  <span class="text-black font-bold">$0</span>
                </div>
              </div>
              
              <div class="flex flex-col gap-1 mb-8 border-t border-gray-200 pt-6">
                <div class="flex justify-between items-baseline">
                  <span class="text-lg font-bold text-black uppercase tracking-wider">Total</span>
                  <span class="text-[32px] font-extrabold text-black tracking-tight">{{ formatearPrecio(totalPrice()) }}</span>
                </div>
                <span class="text-xs text-gray-500 self-end">Sujeto a costos extra de envío</span>
              </div>
              
              <button 
                (click)="iniciarCheckout()"
                [disabled]="items().length === 0"
                class="w-full h-14 rounded-sm bg-black text-white text-[16px] font-bold flex items-center justify-center gap-3 uppercase tracking-wider hover:bg-gray-800 transition-colors cursor-pointer border border-black mb-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Proceder al Pago
              </button>
              
              <a routerLink="/productos" class="w-full h-12 rounded-sm bg-white border border-gray-300 text-black text-[14px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:border-black transition-colors cursor-pointer no-underline mb-4">
                Seguir comprando
              </a>

              <!-- Beneficios -->
               <div class="mt-4 flex flex-col gap-4 border-t border-gray-200 pt-6">
                 <div class="flex items-center gap-3 text-sm text-gray-600 font-medium">
                   <svg class="text-black" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                   Pago 100% Seguro
                 </div>
                 <div class="flex items-center gap-3 text-sm text-gray-600 font-medium">
                   <svg class="text-black" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                   Datos Encriptados y Protegidos
                 </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>

    <!-- Checkout Modal -->
    <div *ngIf="showCheckoutModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" (click)="closeCheckout()">
      <div class="bg-white rounded-sm w-full max-w-xl shadow-2xl flex flex-col border border-gray-200" (click)="$event.stopPropagation()">
        
        <div class="p-6 border-b border-black flex justify-between items-center bg-gray-50">
          <h2 class="text-lg font-bold text-black uppercase tracking-wider m-0 flex items-center gap-3">
            <svg class="text-black" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            Detalles de Envío
          </h2>
          <button (click)="closeCheckout()" class="text-gray-400 hover:text-black transition-colors bg-transparent border-none cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="p-8 overflow-y-auto max-h-[75vh] bg-white">
          <form #checkoutForm="ngForm" (ngSubmit)="confirmarPedido()" class="flex flex-col gap-6">
            
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Dirección completa *</label>
              <input type="text" [(ngModel)]="checkoutData.direccion_envio" name="direccion" required placeholder="Ej: Cra. 14 # 22-10 Apto 301" class="w-full px-4 py-3 rounded-sm border border-gray-300 focus:border-black outline-none transition-colors text-black font-medium">
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Ciudad *</label>
                <input type="text" [(ngModel)]="checkoutData.ciudad" name="ciudad" required placeholder="Ej: Armenia" class="w-full px-4 py-3 rounded-sm border border-gray-300 focus:border-black outline-none transition-colors text-black font-medium">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Departamento *</label>
                <input type="text" [(ngModel)]="checkoutData.departamento" name="departamento" required placeholder="Ej: Quindío" class="w-full px-4 py-3 rounded-sm border border-gray-300 focus:border-black outline-none transition-colors text-black font-medium">
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono de contacto *</label>
              <input type="tel" [(ngModel)]="checkoutData.telefono_contacto" name="telefono" required placeholder="Ej: 300 123 4567" class="w-full px-4 py-3 rounded-sm border border-gray-300 focus:border-black outline-none transition-colors text-black font-medium">
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Método de pago</label>
              <select [(ngModel)]="checkoutData.metodo_pago" name="pago" class="w-full px-4 py-3 rounded-sm border border-gray-300 focus:border-black outline-none transition-colors text-black font-medium bg-white">
                <option value="contraentrega">Contraentrega (Pago al recibir)</option>
                <option value="transferencia">Transferencia Bancaria</option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Notas adicionales (Opcional)</label>
              <textarea [(ngModel)]="checkoutData.notas" name="notas" rows="3" placeholder="Instrucciones para llegar..." class="w-full px-4 py-3 rounded-sm border border-gray-300 focus:border-black outline-none transition-colors text-black font-medium resize-none"></textarea>
            </div>

            <!-- Error Feedback -->
            <div *ngIf="checkoutError()" class="p-4 border border-red-500 text-red-600 bg-red-50 rounded-sm text-sm flex items-center gap-3 font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {{ checkoutError() }}
            </div>

            <div class="mt-4 pt-6 border-t border-gray-200 flex flex-col gap-6">
              <div class="flex justify-between items-center bg-gray-50 p-4 border border-gray-200 rounded-sm">
                <span class="text-sm text-gray-500 font-bold uppercase tracking-wider">Total a pagar</span>
                <span class="text-2xl font-extrabold text-black tracking-tight">{{ formatearPrecio(totalPrice()) }}</span>
              </div>
              <button 
                type="submit" 
                [disabled]="checkoutForm.invalid || isSubmitting()"
                class="w-full py-4 rounded-sm bg-black hover:bg-gray-800 text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black flex justify-center items-center gap-3 cursor-pointer">
                <span *ngIf="isSubmitting()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <svg *ngIf="!isSubmitting()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Confirmar Compra
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CartSummaryComponent {
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  items = toSignal(this.cartService.items$, { initialValue: [] });
  
  totalCount = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });

  totalPrice = computed(() => {
    return this.items().reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  });

  showCheckoutModal = signal(false);
  isSubmitting = signal(false);
  checkoutError = signal<string | null>(null);

  checkoutData = {
    direccion_envio: '',
    ciudad: '',
    departamento: '',
    telefono_contacto: '',
    metodo_pago: 'contraentrega',
    notas: ''
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

  iniciarCheckout(): void {
    if (!this.authService.isLoggedIn.getValue()) {
      alert('Debes iniciar sesión para finalizar tu compra.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    this.showCheckoutModal.set(true);
  }

  closeCheckout(): void {
    this.showCheckoutModal.set(false);
    this.checkoutError.set(null);
  }

  confirmarPedido(): void {
    if (this.isSubmitting()) return;
    
    this.isSubmitting.set(true);
    this.checkoutError.set(null);

    const payload = {
      items: this.items().map(i => ({
        producto_id: i.producto.id,
        variante_id: i.variante?.id,
        cantidad: i.cantidad
      })),
      ...this.checkoutData
    };

    this.pedidoService.crearPedido(payload).subscribe({
      next: (res) => {
        this.cartService.clearCart();
        this.closeCheckout();
        // Redirigir al cliente a su historial de pedidos
        this.router.navigate(['/pedidos']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.checkoutError.set(err.error?.error || 'Ocurrió un error al procesar tu pedido. Inténtalo de nuevo.');
      }
    });
  }

  formatearPrecio(precio: number): string {
    return `$ ${Math.round(precio).toLocaleString('es-ES')}`;
  }
}
