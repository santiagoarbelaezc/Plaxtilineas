import { Component, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart-icon',
  standalone: true,
  imports: [RouterModule],
  template: `
    <button routerLink="/carrito" class="relative w-10 h-10 rounded-full bg-white border border-[#e4e4e7] flex items-center justify-center hover:bg-[#16a34a]/5 hover:border-[#16a34a] hover:-translate-y-0.5 transition-all cursor-pointer shadow-none outline-none group" aria-label="Carrito de compras" id="cart-nav-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#09090b] group-hover:text-[#16a34a] transition-colors">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      
      @if (totalItems() > 0) {
        <span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#16a34a] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in duration-300">
          {{ totalItems() }}
        </span>
      }
    </button>
  `
})
export class CartIconComponent {
  private cartService = inject(CartService);
  private items = toSignal(this.cartService.items$, { initialValue: [] });
  
  totalItems = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });
}
