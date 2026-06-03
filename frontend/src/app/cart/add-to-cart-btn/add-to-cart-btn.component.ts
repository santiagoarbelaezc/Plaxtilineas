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
    @if (!isAdded) {
      <button (click)="addToCart()" [class]="getButtonClasses()" [ngStyle]="getButtonStyle()">
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="getIconSize()" [attr.height]="getIconSize()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 group-hover:rotate-90"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Agregar al Carrito
      </button>
    } @else {
      <button [class]="getButtonClasses(true)">
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="getIconSize()" [attr.height]="getIconSize()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
        ¡En Desarrollo!
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
  @Input() theme: 'corporate' | 'whatsapp' = 'corporate';

  isAdded = false;
  private cartService = inject(CartService);

  getButtonClasses(forAddedState: boolean = false): string {
    const hClass = this.size === 'lg' ? 'h-14' : this.size === 'sm' ? 'h-10' : 'h-12';
    const roundedClass = this.size === 'lg' ? 'rounded-2xl' : 'rounded-xl';
    const textClass = this.size === 'lg' ? 'text-base' : 'text-sm';
    
    // Configuración de colores base según tema (Sincronización total con WhatsApp)
    const isWp = this.theme === 'whatsapp';
    const primaryGreen = isWp ? '#1ba852' : '#368c44';
    
    // Gradiente premium para hover
    const bgHoverGradient = isWp 
      ? 'hover:bg-gradient-to-br hover:from-[#1ba852] hover:to-[#0d6a5d]' 
      : 'hover:bg-[#368c44]';

    // MODO MINIMAL (Elegante)
    if (this.isMinimal) {
      if (forAddedState) {
        return `w-full ${hClass} ${roundedClass} bg-green-50 text-[${primaryGreen}] ${textClass} font-semibold flex items-center justify-center gap-2 cursor-default border border-transparent transition-all`;
      }
      const borderClass = this.size === 'lg' ? 'border-2' : 'border';
      const borderColor = isWp ? 'border-[#1ba852]/60' : 'border-[#368c44]/40';
      return `w-full ${hClass} ${roundedClass} bg-transparent text-[${primaryGreen}] ${textClass} font-semibold flex items-center justify-center gap-2 ${borderClass} ${borderColor} ${bgHoverGradient} hover:text-white hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-md group`;
    }

    // MODO PREMIUM (Llamativo)
    if (this.isPremium) {
      if (forAddedState) {
        return `w-full ${hClass} ${roundedClass} bg-white border-2 border-[${primaryGreen}] text-[${primaryGreen}] ${textClass} font-bold flex items-center justify-center gap-3 cursor-default transition-all shadow-sm`;
      }
      const bgClass = isWp ? 'bg-gradient-to-br from-[#1ba852] to-[#0d6a5d]' : 'bg-[#368c44]';
      return `w-full ${hClass} ${roundedClass} ${bgClass} text-white ${textClass} font-bold flex items-center justify-center gap-3 hover:-translate-y-0.5 hover:shadow-xl transition-all border-none shadow-lg group`;
    }

    // MODO ESTÁNDAR
    if (forAddedState) {
      return `w-full ${hClass} ${roundedClass} bg-white border-2 border-[${primaryGreen}] text-[${primaryGreen}] ${textClass} font-bold flex items-center justify-center gap-2 cursor-default transition-all shadow-sm`;
    }
    
    const standardBg = isWp 
      ? 'bg-gradient-to-br from-[#1ba852] to-[#0d6a5d]' 
      : 'bg-gradient-to-br from-[#368c44] to-[#25d366]';
      
    return `w-full ${hClass} ${roundedClass} ${standardBg} text-white ${textClass} font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer border-none shadow-md`;
  }

  getButtonStyle() {
    // Ya no aplicamos color aquí porque sobreescribe el hover de Tailwind
    return {};
  }

  getIconSize(): number {
    if (this.size === 'lg') return 20;
    if (this.size === 'sm') return 14;
    return 16;
  }

  addToCart() {
    if (!this.producto) return;
    
    // Activa la notificación visual de 'En Desarrollo'
    this.isAdded = true;
    
    // Preparar redirección a WhatsApp provisionalmente
    const numeroWhatsApp = '573007365939';
    let itemName = this.producto.nombre;
    if (this.variante) {
      itemName += ` - ${this.variante.nombre}`;
    }
    const mensaje = `Hola Plaxtilineas, me interesa adquirir ${this.cantidad} unidad(es) de: ${itemName}`;
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    
    // Esperar el aviso visual y redirigir
    setTimeout(() => {
      window.open(url, '_blank');
      this.isAdded = false;
    }, 1500);
  }
}
