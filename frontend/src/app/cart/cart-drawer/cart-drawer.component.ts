import { Component, Input, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (isAllowedRoute) {
      <!-- Botón flotante -->
      @if (!isOpen && false) {
        <div class="fixed right-6 top-[calc(var(--navbar-height)+50px)] z-50 flex items-center group">
        
        <!-- Notificación emergente -->
        @if (showNotification && totalCount() > 0) {
          <div class="absolute right-[calc(100%+14px)] bg-gray-900/90 backdrop-blur text-white text-[13px] font-medium px-4 py-2.5 rounded-xl whitespace-nowrap shadow-lg flex items-center gap-2.5 max-md:hidden animate-tooltip">
            <span class="w-2.5 h-2.5 rounded-full bg-[#25d366] shadow-[0_0_8px_rgba(37,211,102,0.8)] animate-pulse"></span>
            El carrito tiene {{ totalCount() }} {{ totalCount() === 1 ? 'objeto' : 'objetos' }}
            <div class="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900/90 rotate-45"></div>
          </div>
        }

        <button 
          class="bg-white text-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100 px-5 py-3.5 rounded-[16px] font-semibold text-[15px] flex items-center gap-2.5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:text-[#368c44] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] group/btn"
          (click)="isOpen = true"
        >
          <div class="relative flex items-center justify-center group-hover/btn:scale-110 transition-transform text-current">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            @if (totalCount() > 0) {
              <span class="absolute -top-2 -right-2.5 min-w-[18px] h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 shadow-[0_0_0_2px_#fff] animate-in zoom-in duration-300">
                {{ totalCount() }}
              </span>
            }
          </div>
          <span class="font-bold tracking-tight">Carrito</span>
        </button>
      </div>
    }

    <!-- Panel Lateral -->
    @if (isOpen) {
      <div class="fixed left-0 right-0 bottom-0 bg-black/30 z-40 backdrop-blur-sm top-[calc(var(--navbar-height)+40px)] transition-all duration-500 cursor-pointer hidden md:block" (click)="closeDrawer()"></div>
      
      <div class="fixed right-0 bottom-0 w-[420px] max-w-[95vw] bg-white/95 backdrop-blur-md z-50 flex flex-col shadow-[-8px_0_40px_rgba(0,0,0,0.15)] border-l border-gray-100 rounded-l-[20px] top-[calc(var(--navbar-height)+40px)] transition-all duration-500 hidden md:flex">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-gray-100/50 flex items-center justify-between">
          <h3 class="font-bold text-[19px] text-gray-800 m-0 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-800">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Mi Carrito ({{ totalCount() }})
          </h3>
          <button class="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all duration-300 hover:rotate-90 border-none cursor-pointer" (click)="closeDrawer()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1 custom-scrollbar">
          
          @if (items().length === 0) {
            <div class="flex flex-col items-center justify-center h-full py-12 text-center">
              <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              </div>
              <p class="text-gray-500 font-medium">Tu carrito está vacío</p>
              <button (click)="closeDrawer()" class="mt-4 text-[#368c44] font-bold text-sm hover:underline cursor-pointer border-none bg-transparent">Continuar comprando</button>
            </div>
          } @else {
            <!-- Encabezados de tabla -->
            <div class="grid grid-cols-[2.5fr_1.2fr_1fr_0.6fr] items-center px-2 py-3 mb-2 font-semibold text-[12px] text-gray-500 uppercase tracking-wider bg-gray-50/80 rounded-lg">
              <span class="text-left">Producto</span>
              <span class="text-center">Cant.</span>
              <span class="text-right">Subtotal</span>
              <span class="text-center">Acc.</span>
            </div>

            @for (item of items(); track item.id) {
              <div class="grid grid-cols-[2.5fr_1.2fr_1fr_0.6fr] items-center p-3 border-b border-gray-50/50 transition-all duration-300 hover:bg-[#368c44]/5 hover:translate-x-1 rounded-xl cursor-default group">
                <div class="flex flex-col justify-center pe-2">
                  <span class="text-[14px] font-semibold text-gray-800 group-hover:text-[#368c44] transition-colors leading-tight">{{ item.producto.nombre }}</span>
                  <span class="text-[11px] text-gray-400 mt-1">
                    {{ item.variante?.nombre || item.producto.subcategoria || 'Genérico' }}
                  </span>
                  @if (item.producto.controlar_stock && item.producto.stock !== undefined) {
                    <span class="text-[10px] text-orange-600 font-semibold mt-0.5">
                      {{ item.producto.stock - item.cantidad }} disp.
                    </span>
                  }
                </div>
                
                <div class="flex items-center justify-center gap-2 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100 group-hover:bg-white group-hover:border-[#368c44]/20 transition-all">
                  <button 
                    (click)="decreaseQuantity(item.id, item.cantidad)"
                    class="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-md font-bold text-[15px] cursor-pointer hover:bg-[#368c44]/10 hover:text-[#368c44] hover:border-[#368c44]/30 transition-all">−</button>
                  <span class="min-w-[14px] text-center text-[14px] font-bold text-gray-800">{{ item.cantidad }}</span>
                  <button 
                    (click)="increaseQuantity(item.id, item.cantidad)"
                    [disabled]="isAtMaxStock(item)"
                    [class.opacity-40]="isAtMaxStock(item)"
                    [class.cursor-not-allowed]="isAtMaxStock(item)"
                    class="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-md font-bold text-[15px] cursor-pointer hover:bg-[#368c44]/10 hover:text-[#368c44] hover:border-[#368c44]/30 transition-all">+</button>
                </div>
                
                <div class="text-[14.5px] font-bold text-gray-800 text-right group-hover:text-[#368c44] transition-colors">
                  {{ formatearPrecio(item.precioUnitario * item.cantidad) }}
                </div>
                
                <div class="flex items-center justify-center">
                  <button 
                    (click)="removeItem(item.id)"
                    class="w-9 h-9 flex items-center justify-center bg-red-50/50 text-red-500 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 hover:scale-110 shadow-sm transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
            }
          }
        </div>

        <div class="border-t border-gray-100/50 px-5 py-5 mt-2">
          
          <div class="bg-gradient-to-r from-[#368c44]/5 to-transparent border border-[#368c44]/10 rounded-[14px] p-4 flex justify-between items-center mb-5">
            <span class="text-[16px] font-bold text-gray-600">Total:</span>
            <div class="flex items-center gap-1">
              <span class="text-[19px] font-medium tracking-[0.01em] text-[#368c44]">{{ formatearPrecio(totalPrice()) }}</span>
            </div>
          </div>

          <button 
            [disabled]="items().length === 0"
            routerLink="/carrito"
            (click)="closeDrawer()"
            class="w-full h-12 rounded-[14px] bg-gradient-to-br from-[#368c44] to-[#25d366] text-white text-[16px] font-bold flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(37,211,102,0.35)] transition-all cursor-pointer border-none shadow-[0_4px_15px_rgba(54,140,68,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            Finalizar Pedido
          </button>
          
          @if (items().length > 0) {
            <div class="flex gap-3 mt-3">
              <button 
                (click)="clearCart()"
                class="flex-1 h-10 rounded-xl bg-white border border-red-200 text-red-600 text-[14px] font-semibold hover:bg-red-50 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-[0_4px_15px_rgba(239,68,68,0.1)] transition-all cursor-pointer flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                Vaciar carrito
              </button>
            </div>
          }
        </div>
      </div>
    }
    }
    <style>
      .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(54, 140, 68, 0.2);
          border-radius: 3px;
          transition: all 0.3s ease;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(54, 140, 68, 0.4);
      }
      .animate-tooltip {
          animation: tooltip-slide 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      @keyframes tooltip-slide {
          from { opacity: 0; transform: translateX(15px); }
          to { opacity: 1; transform: translateX(0); }
      }
    </style>
  `
})
export class CartDrawerComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  showNotification = false;
  isAllowedRoute = true;
  
  private intervalId: any;
  private router = inject(Router);
  private cartService = inject(CartService);
  private routerSub: any;
  private drawerSub: any;

  // Signales para UI dinámica
  items = toSignal(this.cartService.items$, { initialValue: [] });
  
  totalCount = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });

  totalPrice = computed(() => {
    return this.items().reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  });

  ngOnInit() {
    // Escuchar cambios de ruta para ocultar el carrito en admin y checkout
    this.checkRoute(this.router.url);
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkRoute(event.urlAfterRedirects);
      }
    });

    // El panel flotante del social-buttons ahora maneja la apertura automática.
    // El cart-drawer lateral ya no se abre automáticamente al añadir un producto.
    this.drawerSub = this.cartService.isOpenDrawer.subscribe(open => {
      this.isOpen = open;
    });

    this.intervalId = setInterval(() => {
      if (!this.isOpen && this.isAllowedRoute && this.totalCount() > 0) {
        this.showNotification = true;
        setTimeout(() => {
          this.showNotification = false;
        }, 5000);
      }
    }, 15000);
  }

  private checkRoute(url: string) {
    this.isAllowedRoute = !url.includes('/admin') && !url.includes('/carrito');
    if (!this.isAllowedRoute) {
      this.closeDrawer();
    }
  }

  closeDrawer() {
    this.isOpen = false;
    this.showNotification = false;
    this.cartService.closeDrawer();
  }

  increaseQuantity(id: string, current: number) {
    this.cartService.updateQuantity(id, current + 1);
  }

  isAtMaxStock(item: any): boolean {
    return this.cartService.isAtMaxStock(item);
  }

  decreaseQuantity(id: string, current: number) {
    if (current > 1) {
      this.cartService.updateQuantity(id, current - 1);
    }
  }

  removeItem(id: string) {
    this.cartService.removeFromCart(id);
  }

  clearCart() {
    if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
      this.cartService.clearCart();
    }
  }

  formatearPrecio(precio: number): string {
    return `$ ${Math.round(precio).toLocaleString('es-ES')}`;
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.routerSub) this.routerSub.unsubscribe();
    if (this.drawerSub) this.drawerSub.unsubscribe();
  }
}
