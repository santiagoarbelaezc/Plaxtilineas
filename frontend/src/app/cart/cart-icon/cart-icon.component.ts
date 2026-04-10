import { Component, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart-icon',
  standalone: true,
  imports: [RouterModule],
  template: `
    <button routerLink="/carrito" class="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-white hover:border-[#368c44]/30 hover:shadow-md transition-all cursor-pointer border-none shadow-sm outline-none focus:ring-2 focus:ring-[#368c44] group">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-700 group-hover:text-[#368c44] transition-colors">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      
      @if (totalItems() > 0) {
        <span class="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#368c44] to-[#25d366] text-white text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in duration-300">
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
