import { Component, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart-icon',
  standalone: true,
  imports: [RouterModule],
  template: `
    <button routerLink="/carrito" class="cart-nav-btn" aria-label="Carrito de compras" id="cart-nav-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cart-nav-svg">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>

      @if (totalItems() > 0) {
        <span class="cart-nav-badge">
          {{ totalItems() }}
        </span>
      }
    </button>
  `,
  styles: [`
    .cart-nav-btn {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #ffffff;
      border: 1.5px solid #e4e4e7;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #383838;
      cursor: pointer;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
    }
    .cart-nav-btn:hover {
      background: #eaf4ec;
      border-color: #379045;
      color: #379045;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(55, 144, 69, 0.14);
    }
    .cart-nav-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 9999px;
      background: #379045;
      color: #ffffff;
      font-family: var(--font-primary, 'Montserrat', sans-serif);
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(55, 144, 69, 0.35);
    }
  `]
})
export class CartIconComponent {
  private cartService = inject(CartService);
  private items = toSignal(this.cartService.items$, { initialValue: [] });
  
  totalItems = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });
}
