import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService } from '../../../services/cart.service';
import { CartItem } from '../../../models/cart.model';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (visible && item) {
      <div class="fixed top-6 right-6 z-[999999] max-w-sm w-full bg-white/95 backdrop-blur-md border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.12)] rounded-2xl p-4 flex gap-4 animate-slide-in cursor-default group hover:shadow-[0_15px_35px_rgba(0,0,0,0.18)] transition-all">
        <!-- Imagen -->
        <div class="w-16 h-16 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
          @if (item.producto.imagen_url) {
            <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" class="w-full h-full object-contain p-1.5 mix-blend-multiply">
          } @else {
            <svg class="text-gray-300" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          }
        </div>

        <!-- Detalles -->
        <div class="flex-1 flex flex-col justify-between min-w-0 pr-4">
          <div>
            <div class="flex items-center gap-1.5 mb-0.5">
              <span class="w-2 h-2 rounded-full bg-[#25d366] shadow-[0_0_8px_rgba(37,211,102,0.8)] animate-pulse"></span>
              <span class="text-xs font-bold text-[#368c44] uppercase tracking-wider">Agregado al carrito</span>
            </div>
            <h4 class="font-extrabold text-sm text-gray-900 leading-snug truncate">{{ item.producto.nombre }}</h4>
            <p class="text-xs text-gray-400 mt-0.5 font-medium">
              {{ item.variante?.nombre || item.producto.subcategoria || 'Genérico' }} • {{ item.cantidad }} {{ item.cantidad === 1 ? 'unidad' : 'unidades' }}
            </p>
          </div>
          
          <div class="flex gap-3 mt-2">
            <button (click)="openCart()" class="text-xs font-bold text-[#368c44] hover:underline cursor-pointer border-none bg-transparent p-0">Ver Carrito</button>
            <span class="text-gray-200">|</span>
            <button (click)="closeToast()" class="text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer border-none bg-transparent p-0">Cerrar</button>
          </div>
        </div>

        <!-- Botón cerrar (X) -->
        <button (click)="closeToast()" class="absolute top-3.5 right-3.5 text-gray-300 hover:text-gray-500 cursor-pointer border-none bg-transparent">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    }

    <style>
      .animate-slide-in {
        animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes slideInRight {
        from { transform: translateX(110%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private subscription!: Subscription;

  visible = false;
  item: CartItem | null = null;
  private timeoutId: any;

  ngOnInit() {
    this.subscription = this.cartService.lastAddedItem$.subscribe(newItem => {
      // Don't show toast if there's no item or during initial load of cart (e.g. BehaviorSubject default value)
      if (newItem) {
        this.item = newItem;
        this.visible = true;

        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
          this.visible = false;
        }, 3500);
      }
    });
  }

  closeToast() {
    this.visible = false;
  }

  openCart() {
    this.visible = false;
    this.cartService.openDrawer();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
