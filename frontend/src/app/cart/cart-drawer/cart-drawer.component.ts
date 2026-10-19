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
      <div class="fixed inset-0 bg-black/45 z-[9998] backdrop-blur-sm transition-all duration-300 cursor-pointer hidden md:block" (click)="closeDrawer()"></div>
      
      <div class="fixed top-0 right-0 bottom-0 w-[440px] max-w-[95vw] bg-white z-[9999] flex flex-col shadow-[-12px_0_40px_rgba(0,0,0,0.15)] border-l border-zinc-200 transition-all duration-300 hidden md:flex font-['Inter_Tight',sans-serif]">
        <!-- Línea Superior de Resplandor Esmeralda -->
        <div class="h-[2px] w-full bg-gradient-to-r from-transparent via-[#16a34a] to-transparent"></div>
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-white">
          <div class="flex flex-col">
            <span class="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#16a34a] flex items-center gap-1.5">
              <span class="w-3.5 h-[2px] bg-[#16a34a] inline-block rounded"></span>
              Plaxtilineas
            </span>
            <h3 class="font-extrabold text-[19px] text-zinc-900 m-0 tracking-tight flex items-center gap-2 mt-0.5">
              Mi Carrito ({{ totalCount() }})
            </h3>
          </div>
          <button class="w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-900 hover:text-white flex items-center justify-center transition-all duration-200 border-none cursor-pointer" (click)="closeDrawer()" title="Cerrar carrito">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 custom-scrollbar bg-white">
          
          @if (items().length === 0) {
            <div class="flex flex-col items-center justify-center h-full py-16 text-center">
              <div class="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100 text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              </div>
              <h4 class="text-zinc-900 font-bold text-[16px] m-0">Tu carrito está vacío</h4>
              <p class="text-zinc-500 font-normal text-xs mt-1 max-w-[240px]">Agrega productos técnicos, lonas o empaques de nuestro catálogo.</p>
              <button (click)="closeDrawer()" routerLink="/productos" class="mt-4 px-5 py-2.5 rounded-full bg-zinc-900 text-white font-bold text-xs uppercase tracking-wider hover:bg-[#16a34a] transition-colors cursor-pointer border-none">Explorar Catálogo</button>
            </div>
          } @else {
            @for (item of items(); track item.id) {
              <div class="flex items-center gap-3 p-3.5 bg-white border border-zinc-200/80 rounded-2xl hover:border-[#16a34a]/40 hover:shadow-sm transition-all group">
                <div class="w-16 h-16 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                  @if (item.producto.imagen_url) {
                    <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" class="w-full h-full object-contain">
                  } @else {
                    <svg class="text-zinc-300" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  }
                </div>

                <div class="flex-1 min-w-0">
                  <h4 class="text-[13.5px] font-bold text-zinc-900 group-hover:text-[#16a34a] transition-colors truncate m-0">{{ item.producto.nombre }}</h4>
                  <div class="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                    <span class="truncate">{{ item.variante?.nombre || item.producto.subcategoria || 'General' }}</span>
                  </div>
                  <div class="text-[14px] font-extrabold text-zinc-900 mt-1">
                    {{ formatearPrecio(item.precioUnitario * item.cantidad) }}
                  </div>
                </div>

                <div class="flex flex-col items-end gap-2">
                  <button 
                    (click)="removeItem(item.id)"
                    class="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                    title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>

                  <div class="flex items-center border border-zinc-200 rounded-lg overflow-hidden h-7 bg-zinc-50">
                    <button 
                      (click)="decreaseQuantity(item.id, item.cantidad)"
                      class="w-6 h-full bg-white flex items-center justify-center text-zinc-700 hover:bg-[#16a34a] hover:text-white font-bold text-xs transition-colors border-none cursor-pointer">−</button>
                    <span class="w-7 text-center text-xs font-bold text-zinc-900">{{ item.cantidad }}</span>
                    <button 
                      (click)="increaseQuantity(item.id, item.cantidad)"
                      [disabled]="isAtMaxStock(item)"
                      class="w-6 h-full bg-white flex items-center justify-center text-zinc-700 hover:bg-[#16a34a] hover:text-white font-bold text-xs transition-colors border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <div class="border-t border-zinc-100 p-5 bg-white">
          <div class="flex justify-between items-baseline mb-4">
            <span class="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Total a Pagar:</span>
            <span class="text-2xl font-extrabold text-[#16a34a] tracking-tight">{{ formatearPrecio(totalPrice()) }}</span>
          </div>

          <button 
            [disabled]="items().length === 0"
            routerLink="/carrito"
            (click)="closeDrawer()"
            class="w-full h-12 rounded-full bg-zinc-950 hover:bg-[#16a34a] text-white text-[14px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#16a34a]/25 transition-all cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            Finalizar Pedido
          </button>
          
          @if (items().length > 0) {
            <button 
              (click)="clearCart()"
              class="w-full mt-2 py-2 text-zinc-400 hover:text-red-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center gap-1.5">
              Vaciar carrito
            </button>
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

    // El panel flotante del social-buttons maneja la apertura del carrito.
    // Desactivamos apertura redundante en cart-drawer.
    this.drawerSub = this.cartService.isOpenDrawer.subscribe(_open => {
      this.isOpen = false;
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
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${precioFormateado}`;
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.routerSub) this.routerSub.unsubscribe();
    if (this.drawerSub) this.drawerSub.unsubscribe();
  }
}
