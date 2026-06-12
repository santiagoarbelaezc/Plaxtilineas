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
    <div class="min-h-screen bg-gray-50 flex flex-col font-sans mb-10" style="padding-top: calc(var(--navbar-height) + 40px);">
      
      <div class="w-full max-w-7xl mx-auto px-4 md:px-8">
        
        <!-- Header -->
        <div class="mb-8 flex items-center gap-3 border-b border-gray-200 pb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="text-[#368c44]">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <h1 class="text-3xl font-extrabold text-gray-800 tracking-tight m-0">Finalizar Compra</h1>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          
          <!-- Columna Izquierda: Los Productos -->
          <div class="flex flex-col gap-5">
            
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 relative overflow-hidden">
              <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#368c44] to-[#25d366]"></div>
              
              <h2 class="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 m-0">
                Tus Productos ({{ totalCount() }})
              </h2>
              
              <div class="flex flex-col gap-2">
                @if (items().length === 0) {
                  <div class="py-12 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </div>
                    <p class="text-gray-500 font-medium">No hay productos en tu carrito.</p>
                    <a routerLink="/productos" class="mt-4 text-[#368c44] font-bold hover:underline">Ir a la tienda</a>
                  </div>
                } @else {
                  @for (item of items(); track item.id; let last = $last) {
                    <!-- Item -->
                    <div class="grid grid-cols-[100px_1fr_auto] gap-6 items-center p-4 border border-transparent hover:border-gray-100 hover:bg-gray-50/50 rounded-xl transition-all group relative">
                      <div class="bg-gray-100 rounded-lg w-[100px] h-[100px] flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden relative">
                        @if (item.producto.imagen_url) {
                          <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" class="w-full h-full object-contain p-2">
                        } @else {
                          <svg class="text-gray-300 w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        }
                      </div>
                      
                      <div class="flex flex-col gap-1.5">
                        <h3 class="text-lg font-semibold text-gray-800 m-0 group-hover:text-[#368c44] transition-colors leading-tight">{{ item.producto.nombre }}</h3>
                        <p class="text-sm text-gray-500 m-0">
                          {{ item.variante ? item.variante.nombre : (item.producto.subcategoria || 'Genérico') }} 
                          · {{ item.producto.unidad || 'Unidades' }}
                        </p>
                        <div class="mt-2 flex items-center gap-4">
                          <span class="text-sm text-gray-400 font-medium tracking-wide">Precio unitario: {{ formatearPrecio(item.precioUnitario) }}</span>
                        </div>
                      </div>
                      
                      <div class="flex flex-col items-end gap-3 justify-center">
                        <div class="text-[20px] font-bold text-gray-800 tracking-tight">{{ formatearPrecio(item.precioUnitario * item.cantidad) }}</div>
                        <div class="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                          <button 
                            (click)="decreaseQuantity(item.id, item.cantidad)"
                            class="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#368c44] hover:border-[#368c44] transition-colors cursor-pointer shadow-sm text-xl">−</button>
                          <span class="w-8 text-center font-bold text-gray-800">{{ item.cantidad }}</span>
                          <button 
                            (click)="increaseQuantity(item.id, item.cantidad)"
                            class="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#368c44] hover:border-[#368c44] transition-colors cursor-pointer shadow-sm text-xl">+</button>
                        </div>
                      </div>
                      
                      <button (click)="removeItem(item.id)" class="absolute right-6 top-6 text-gray-400 hover:text-red-500 transition-colors p-2 cursor-pointer bg-transparent border-none rounded-full hover:bg-red-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                    
                    @if (!last) {
                      <div class="h-px w-full bg-gray-100 my-1"></div>
                    }
                  }
                }
              </div>

            </div>

          </div>

          <!-- Columna Derecha: Tarjeta de Resumen / Checkout Fija -->
          <div class="flex flex-col">
            
            <div class="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col sticky top-[calc(var(--navbar-height)+40px)]">
              <h2 class="text-xl font-bold text-gray-800 mb-6 m-0 flex items-center gap-2">
                Resumen del pedido
              </h2>
              
              <div class="flex flex-col gap-4 text-gray-600 mb-6 font-medium">
                <div class="flex justify-between items-center text-[15px]">
                  <span>Subtotal ({{ totalCount() }} {{ totalCount() === 1 ? 'producto' : 'productos' }})</span>
                  <span class="text-gray-800 font-bold">{{ formatearPrecio(totalPrice()) }}</span>
                </div>
                
                <div class="flex justify-between items-center text-[15px]">
                  <span>Envío estimado</span>
                  <span class="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded text-sm">A calcular</span>
                </div>
                
                <div class="flex justify-between items-center text-[15px]">
                  <span>Impuestos (IVA)</span>
                  <span class="text-gray-800 font-bold">$0</span>
                </div>
              </div>
              
              <div class="h-px bg-gray-200 w-full mb-6 relative">
                <div class="absolute -top-1 left-2 w-16 h-2 bg-gradient-to-r from-[#368c44] to-transparent opacity-50"></div>
              </div>
              
              <div class="flex flex-col gap-1 mb-8">
                <div class="flex justify-between items-baseline">
                  <span class="text-lg font-bold text-gray-800">Total a Pagar</span>
                  <span class="text-[28px] font-bold text-[#368c44] tracking-tight">{{ formatearPrecio(totalPrice()) }}</span>
                </div>
                <span class="text-xs text-gray-400 self-end">Sujeto a costos extra de envío</span>
              </div>
              
              <button 
                (click)="iniciarCheckout()"
                [disabled]="items().length === 0"
                class="w-full h-14 rounded-xl bg-gradient-to-br from-[#368c44] to-[#25d366] text-white text-[17px] font-bold flex items-center justify-center gap-2.5 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(37,211,102,0.35)] transition-all cursor-pointer border-none shadow-[0_4px_15px_rgba(54,140,68,0.2)] group mb-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:scale-110 transition-transform"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Proceder al Pago Seguro
              </button>
              
              <a routerLink="/productos" class="w-full h-12 rounded-xl bg-white border-2 border-gray-200 text-gray-600 text-[15px] font-bold flex flex-row items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 transition-all cursor-pointer no-underline group shadow-sm mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:-translate-x-1 transition-transform"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Continuar comprando
              </a>

              <a routerLink="/" class="w-full h-12 rounded-xl bg-transparent border-none text-gray-500 text-[14px] font-semibold flex flex-row items-center justify-center gap-2 hover:bg-gray-100 hover:text-gray-800 transition-all cursor-pointer no-underline group">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Volver al inicio
              </a>

              <!-- Beneficios -->
               <div class="mt-8 bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
                 <div class="flex items-center gap-3 text-sm text-gray-600 font-medium">
                   <svg class="text-[#368c44]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                   Pago 100% Seguro
                 </div>
                 <div class="flex items-center gap-3 text-sm text-gray-600 font-medium">
                   <svg class="text-[#368c44]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                   Datos Encriptados y Protegidos
                 </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>

    <!-- Checkout Modal -->
    <div *ngIf="showCheckoutModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" (click)="closeCheckout()">
      <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" (click)="$event.stopPropagation()">
        
        <div class="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center relative overflow-hidden">
          <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=')] opacity-30"></div>
          <h2 class="text-xl font-bold m-0 relative z-10 flex items-center gap-2">
            <svg class="text-emerald-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Detalles de Envío
          </h2>
          <button (click)="closeCheckout()" class="relative z-10 text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="p-6 overflow-y-auto max-h-[70vh]">
          <form #checkoutForm="ngForm" (ngSubmit)="confirmarPedido()" class="flex flex-col gap-4">
            
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700">Dirección completa *</label>
              <input type="text" [(ngModel)]="checkoutData.direccion_envio" name="direccion" required placeholder="Ej: Cra. 14 # 22-10 Apto 301" class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-800">
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-gray-700">Ciudad *</label>
                <input type="text" [(ngModel)]="checkoutData.ciudad" name="ciudad" required placeholder="Ej: Armenia" class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-800">
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-gray-700">Departamento *</label>
                <input type="text" [(ngModel)]="checkoutData.departamento" name="departamento" required placeholder="Ej: Quindío" class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-800">
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700">Teléfono de contacto *</label>
              <input type="tel" [(ngModel)]="checkoutData.telefono_contacto" name="telefono" required placeholder="Ej: 300 123 4567" class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-800">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700">Método de pago</label>
              <select [(ngModel)]="checkoutData.metodo_pago" name="pago" class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-800 bg-white">
                <option value="contraentrega">Contraentrega (Pago al recibir)</option>
                <option value="transferencia">Transferencia Bancaria</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700">Notas adicionales (Opcional)</label>
              <textarea [(ngModel)]="checkoutData.notas" name="notas" rows="2" placeholder="Instrucciones para llegar, quien recibe..." class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-800 resize-none"></textarea>
            </div>

            <!-- Error Feedback -->
            <div *ngIf="checkoutError()" class="mt-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {{ checkoutError() }}
            </div>

            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-sm text-gray-500">Total a pagar</span>
                <span class="text-xl font-bold text-gray-900">{{ formatearPrecio(totalPrice()) }}</span>
              </div>
              <button 
                type="submit" 
                [disabled]="checkoutForm.invalid || isSubmitting()"
                class="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200 border-none flex items-center gap-2 cursor-pointer">
                <span *ngIf="isSubmitting()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
