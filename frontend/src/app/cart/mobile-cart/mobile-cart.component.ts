import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mobile-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <style>
      .mobile-cart-container {
        display: flex !important;
        font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      @media (min-width: 768px) {
        .mobile-cart-container {
          display: none !important;
        }
      }
    </style>
    @if (isOpen && isAllowedRoute) {
      <div class="mobile-cart-container fixed inset-0 bg-white flex flex-col animate-slide-in" style="padding-top: 60px !important; background-color: #ffffff !important; z-index: 99000 !important;">
        
        <!-- Línea Superior de Resplandor Esmeralda -->
        <div style="height: 2px; width: 100%; background: linear-gradient(90deg, transparent, #16a34a 50%, transparent);"></div>

        <!-- Header del Carrito Móvil -->
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 safe-top">
          <button (click)="closeCart()" class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-800 active:scale-95 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          
          <div class="text-center">
            <h2 class="font-extrabold text-[16px] text-gray-900 tracking-tight uppercase" style="letter-spacing: 0.04em;">Mi Carrito</h2>
            <span class="text-[11px] font-bold text-[#16a34a]">{{ totalCount() }} {{ totalCount() === 1 ? 'producto' : 'productos' }}</span>
          </div>
          
          @if (items().length > 0) {
            <button (click)="clearCart()" class="text-xs font-bold text-red-500 hover:text-red-600 active:scale-95 transition-all uppercase tracking-wider">
              Vaciar
            </button>
          } @else {
            <div class="w-10"></div>
          }
        </div>

        <!-- Cuerpo / Lista de Productos -->
        <div class="flex-1 overflow-y-auto px-5 py-4 pb-28 space-y-4 bg-gray-50/50">
          
          @if (items().length === 0) {
            <div class="flex flex-col items-center justify-center h-[60vh] text-center px-6">
              <div class="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 border border-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              @if (!isLoggedIn()) {
                <h3 class="text-lg font-bold text-gray-900 mb-2">Inicia sesión para comprar</h3>
                <p class="text-sm text-gray-500 max-w-xs mb-6">Ingresa con tu cuenta o regístrate para agregar productos al carrito y reservar stock.</p>
                <div class="flex flex-col gap-3 w-full max-w-xs">
                  <button (click)="goToLogin()" class="w-full py-3.5 rounded-full bg-[#16a34a] text-white font-extrabold text-sm uppercase tracking-wider shadow-md hover:bg-[#15803d] active:scale-[0.98] transition-all">
                    Iniciar Sesión
                  </button>
                  <button (click)="goToRegister()" class="w-full py-3.5 rounded-full bg-white text-gray-900 border border-gray-200 font-bold text-sm uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all">
                    Crear una Cuenta
                  </button>
                </div>
              } @else {
                <h3 class="text-lg font-bold text-gray-900 mb-2">Tu carrito está vacío</h3>
                <p class="text-sm text-gray-500 max-w-xs mb-6">Agrega los mejores productos plásticos, espumas y empaques de nuestro catálogo.</p>
                <button (click)="closeCart()" class="w-full max-w-xs py-3.5 rounded-full bg-[#16a34a] text-white font-extrabold text-sm uppercase tracking-wider shadow-md hover:bg-[#15803d] active:scale-[0.98] transition-all">
                  Ver Catálogo
                </button>
              }
            </div>
          } @else {
            @for (item of items(); track item.id) {
              <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-4 relative group">
                <!-- Imagen -->
                <div class="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100 overflow-hidden">
                  @if (item.producto.imagen_url) {
                    <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" class="w-full h-full object-contain p-2 mix-blend-multiply">
                  } @else {
                    <svg class="text-gray-300" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  }
                </div>

                <!-- Info y Controles -->
                <div class="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h4 class="font-bold text-sm text-gray-900 leading-snug truncate pr-6">{{ item.producto.nombre }}</h4>
                    <p class="text-xs text-gray-400 font-medium mt-0.5">{{ item.variante?.nombre || item.producto.subcategoria || 'Genérico' }}</p>
                    @if (getDisponible(item) !== null) {
                      <p class="text-[10px] font-semibold mt-0.5" [class.text-amber-700]="getDisponible(item)! > 0" [class.text-red-600]="getDisponible(item)! <= 0">
                        {{ getDisponible(item)! > 0 ? getDisponible(item) + ' disponibles' : 'Máximo alcanzado' }}
                      </p>
                    }
                  </div>

                  <div class="flex items-center justify-between mt-3">
                    <!-- Controles Cantidad -->
                    <div class="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
                      <button (click)="decreaseQuantity(item.id, item.cantidad)" class="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 font-extrabold active:scale-90 transition-all border border-gray-100">−</button>
                      <span class="w-6 text-center text-xs font-bold text-gray-900">{{ item.cantidad }}</span>
                      <button (click)="increaseQuantity(item.id, item.cantidad)" 
                              [disabled]="isAtMaxStock(item)"
                              [class.opacity-40]="isAtMaxStock(item)"
                              [class.cursor-not-allowed]="isAtMaxStock(item)"
                              class="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 font-extrabold active:scale-90 transition-all border border-gray-100">+</button>
                    </div>

                    <!-- Precio Subtotal -->
                    <div class="text-right">
                      <span class="text-[11px] text-gray-400 block font-medium">Subtotal</span>
                      <span class="font-extrabold text-sm text-[#16a34a]">{{ formatearPrecio(item.precioUnitario * item.cantidad) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Botón Eliminar -->
                <button (click)="removeItem(item.id)" class="absolute top-3 right-3 text-gray-300 hover:text-red-500 active:scale-90 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            }
          }
        </div>

        <!-- Footer / Checkout (Estilo App Móvil Horizontal) -->
        @if (items().length > 0) {
          <div class="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex items-center justify-between gap-4 z-50" style="bottom: 0;">
            <div class="flex flex-col text-left">
              <span class="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total</span>
              <span class="text-lg font-extrabold text-[#16a34a] tracking-tight">{{ formatearPrecio(totalPrice()) }}</span>
            </div>

            <button 
              [disabled]="items().length === 0"
              routerLink="/carrito"
              (click)="closeCart()"
              class="flex-1 max-w-[220px] py-3.5 rounded-full bg-[#09090b] text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:bg-[#16a34a] active:scale-[0.96] transition-all flex items-center justify-center gap-2 border-none">
              <span>Finalizar Pedido</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        }
      </div>
    }

    <style>
      .safe-top {
        padding-top: calc(env(safe-area-inset-top, 0px) + 1rem);
      }
      .pb-safe {
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 90px);
      }
      .animate-slide-in {
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
    </style>
  `
})
export class MobileCartComponent implements OnInit, OnDestroy {
  isOpen = false;
  isAllowedRoute = true;
  
  private router = inject(Router);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private routerSub: any;
  private drawerSub: any;

  items = toSignal(this.cartService.items$, { initialValue: [] });
  isLoggedIn = toSignal(this.authService.isLoggedIn, { initialValue: false });
  
  totalCount = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });

  totalPrice = computed(() => {
    return this.items().reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  });

  ngOnInit() {
    this.checkRoute(this.router.url);
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkRoute(event.urlAfterRedirects);
      }
    });

    this.drawerSub = this.cartService.isOpenDrawer.subscribe(open => {
      this.isOpen = open;
      if (open && this.isAllowedRoute) {
        document.body.classList.add('mobile-cart-active');
      } else {
        document.body.classList.remove('mobile-cart-active');
      }
    });
  }

  private checkRoute(url: string) {
    this.isAllowedRoute = !url.includes('/admin') && !url.includes('/carrito');
    if (!this.isAllowedRoute) {
      this.closeCart();
    }
  }

  closeCart() {
    this.isOpen = false;
    document.body.classList.remove('mobile-cart-active');
    this.cartService.closeDrawer();
  }

  goToLogin() {
    const returnUrl = this.router.url || '/productos';
    this.closeCart();
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  goToRegister() {
    const returnUrl = this.router.url || '/productos';
    this.closeCart();
    this.router.navigate(['/login'], { queryParams: { mode: 'register', returnUrl } });
  }

  increaseQuantity(id: string, current: number) {
    this.cartService.updateQuantity(id, current + 1);
  }

  isAtMaxStock(item: any): boolean {
    return this.cartService.isAtMaxStock(item);
  }

  getDisponible(item: any): number | null {
    return this.cartService.getDisponible(item);
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
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${precioFormateado}`;
  }

  ngOnDestroy() {
    document.body.classList.remove('mobile-cart-active');
    if (this.routerSub) this.routerSub.unsubscribe();
    if (this.drawerSub) this.drawerSub.unsubscribe();
  }
}
