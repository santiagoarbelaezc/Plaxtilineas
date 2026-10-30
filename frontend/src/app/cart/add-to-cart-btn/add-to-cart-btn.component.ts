import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { Producto } from '../../models/producto.model';
import { Variante } from '../../models/variante.model';

@Component({
  selector: 'app-add-to-cart-btn',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showStockError) {
      <button [class]="getButtonClasses('error')" [ngStyle]="getButtonStyle(true)">
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="getIconSize()" [attr.height]="getIconSize()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-bounce"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        Stock Insuficiente
      </button>
    } @else if (isAdded) {
      <button [class]="getButtonClasses('added')" [ngStyle]="getButtonStyle(true)">
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="getIconSize()" [attr.height]="getIconSize()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse"><polyline points="20 6 9 17 4 12"></polyline></svg>
        ¡Agregado!
      </button>
    } @else {
      <button (click)="addToCart()" [disabled]="disabled || isSinStock" [class]="getButtonClasses((disabled || isSinStock) ? 'disabled' : 'normal')" [ngStyle]="getButtonStyle()">
        @if (disabled || isSinStock) {
          <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="getIconSize()" [attr.height]="getIconSize()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
          Sin Stock
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="getIconSize()" [attr.height]="getIconSize()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 group-hover:rotate-90"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Agregar al Carrito
        }
      </button>
    }

  `
})
export class AddToCartBtnComponent {
  @Input() producto!: Producto;
  @Input() variante?: Variante;
  @Input() cantidad: number = 1;
  @Input() isPremium: boolean = false;
  @Input() isMinimal: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'corporate' | 'whatsapp' | 'ikea' | 'black' = 'corporate';
  @Input() disabled: boolean = false;

  isAdded = false;
  showStockError = false;
  private cartService = inject(CartService);

  getButtonClasses(state: 'added' | 'error' | 'disabled' | 'normal' = 'normal'): string {
    const hClass = this.size === 'lg' ? 'h-14' : this.size === 'sm' ? 'h-10' : 'h-12';
    const roundedClass = this.size === 'lg' ? 'rounded-2xl' : 'rounded-xl';
    const textClass = this.size === 'lg' ? 'text-base' : 'text-sm';
    
    // Configuración de colores base según tema
    const isWp = this.theme === 'whatsapp';
    const isIkea = this.theme === 'ikea';
    const isBlack = this.theme === 'black';
    
    // Nombres completos para que Tailwind los reconozca en tiempo de compilación
    const textColorClass = isBlack ? 'text-black' : (isIkea ? 'text-[#0058a3]' : (isWp ? 'text-[#1ba852]' : 'text-[#368c44]'));
    const borderColorClass = isBlack ? 'border-black' : (isIkea ? 'border-[#0058a3]' : (isWp ? 'border-[#1ba852]' : 'border-[#368c44]'));
    
    // Gradiente premium para hover
    const bgHoverGradient = isBlack
      ? 'hover:bg-gray-900'
      : (isIkea 
        ? 'hover:bg-[#00427a]' 
        : (isWp 
          ? 'hover:bg-gradient-to-br hover:from-[#1ba852] hover:to-[#0d6a5d]' 
          : 'hover:bg-[#368c44]'));

    if (state === 'disabled') {
      return `w-full ${hClass} ${roundedClass} bg-gray-200 text-gray-400 ${textClass} font-bold flex items-center justify-center gap-2 cursor-not-allowed border-none`;
    }

    if (state === 'error') {
      return `w-full ${hClass} ${roundedClass} bg-red-50 border-2 border-red-500 text-red-600 ${textClass} font-bold flex items-center justify-center gap-2 cursor-default transition-all shadow-sm`;
    }

    // MODO MINIMAL (Elegante)
    if (this.isMinimal) {
      if (state === 'added') {
        return `w-full ${hClass} ${roundedClass} bg-gray-50 ${textColorClass} ${textClass} font-semibold flex items-center justify-center gap-2 cursor-default border border-transparent transition-all`;
      }
      const borderClass = this.size === 'lg' ? 'border-2' : 'border';
      const borderColorOpacity = isBlack ? 'border-gray-800' : (isIkea ? 'border-[#0058a3]/60' : (isWp ? 'border-[#1ba852]/60' : 'border-[#368c44]/40'));
      return `w-full ${hClass} ${roundedClass} bg-transparent ${textColorClass} ${textClass} font-semibold flex items-center justify-center gap-2 ${borderClass} ${borderColorOpacity} ${bgHoverGradient} hover:text-white hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-md group`;
    }

    // MODO PREMIUM (Llamativo)
    if (this.isPremium) {
      if (state === 'added') {
        return `w-full ${hClass} ${isIkea || isBlack ? 'rounded-full' : roundedClass} bg-white border-2 ${borderColorClass} ${textColorClass} ${textClass} font-bold flex items-center justify-center gap-3 cursor-default transition-all shadow-sm`;
      }
      const bgClass = isBlack ? 'bg-black' : (isIkea ? 'bg-[#0058a3]' : (isWp ? 'bg-gradient-to-br from-[#1ba852] to-[#0d6a5d]' : 'bg-[#368c44]'));
      return `w-full ${hClass} ${isIkea || isBlack ? 'rounded-full' : roundedClass} ${bgClass} text-white ${textClass} font-bold flex items-center justify-center gap-3 hover:-translate-y-0.5 hover:shadow-xl transition-all border-none shadow-lg group`;
    }

    // MODO ESTÁNDAR
    if (state === 'added') {
      return `w-full ${hClass} ${roundedClass} bg-white border-2 ${borderColorClass} ${textColorClass} ${textClass} font-bold flex items-center justify-center gap-2 cursor-default transition-all shadow-sm`;
    }

    const standardBg = isBlack
      ? 'bg-black'
      : (isIkea 
        ? 'bg-[#0058a3]'
        : (isWp 
          ? 'bg-gradient-to-br from-[#1ba852] to-[#0d6a5d]' 
          : 'bg-gradient-to-br from-[#368c44] to-[#25d366]'));
      
    return `w-full ${hClass} ${roundedClass} ${standardBg} text-white ${textClass} font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer border-none shadow-md`;
  }

  getButtonStyle(forAddedState: boolean = false) {
    if (this.theme === 'black') {
      if (this.isMinimal) {
        return {
          'color': '#111111',
          'border-color': forAddedState ? 'transparent' : 'rgba(17, 17, 17, 0.6)'
        };
      }
      if (forAddedState) {
        return {
          'color': '#111111',
          'border-color': '#111111'
        };
      }
      // Modo premium o estándar normal
      return {
        'background-color': '#111111',
        'color': '#ffffff'
      };
    }
    return {};
  }

  getIconSize(): number {
    if (this.size === 'lg') return 20;
    if (this.size === 'sm') return 14;
    return 16;
  }

  get isSinStock(): boolean {
    const stock = this.producto ? this.cartService.getItemStock(this.producto, this.variante) : undefined;
    const controla = this.producto?.controlar_stock === true || this.producto?.controlar_stock === 1 || stock !== undefined;
    return controla && stock !== undefined && stock <= 0;
  }

  addToCart() {
    if (!this.producto || this.disabled || this.isSinStock) {
      console.warn('[Seguridad] Intento de agregar al carrito bloqueado (botón deshabilitado o sin producto/stock).');
      return;
    }
    
    const success = this.cartService.addToCart(this.producto, this.cantidad, this.variante);
    
    if (!success) {
      if (this.cartService.lastRejectReason === 'auth_required') {
        // El modal de autenticación requerida se muestra automáticamente desde CartService
        return;
      }
      this.showStockError = true;
      setTimeout(() => {
        this.showStockError = false;
      }, 3000);
      return;
    }
    
    this.isAdded = true;
    setTimeout(() => {
      this.isAdded = false;
    }, 2000);
  }
}
