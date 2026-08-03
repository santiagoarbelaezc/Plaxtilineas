import { Component, HostListener, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuStateService } from '../../services/menu-state.service';

export interface Producto {
  id: number;
  imagen: string;
  descripcion: string;
  link: string;
  altura: 'alta' | 'baja';
  nombre?: string;
  precio?: number;
  categoria_id?: number;
  subcategoria_id?: number;
}

@Component({
  selector: 'app-grid-producto',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grid-producto.html',
  styleUrls: ['./grid-producto.css']
})
export class GridProductoComponent {
  private router = inject(Router);
  private menuStateService = inject(MenuStateService);

  @Input() productos: Producto[] = [];
  hoveredIndex: number | null = null;
  
  get primeraFila(): Producto[] {
    return this.productos.slice(0, 4);
  }
  
  get segundaFila(): Producto[] {
    return this.productos.slice(4, 8);
  }

  formatearPrecio(precio?: number): string {
    if (precio === null || precio === undefined || isNaN(precio)) return '';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${precioFormateado}`;
  }

  setHoveredIndex(index: number | null): void {
    this.hoveredIndex = index;
  }

  onProductoClick(producto: Producto, event: Event): void {
    event.preventDefault();
    
    // Guardar estado de la subcategoría si existe
    if (producto.subcategoria_id) {
      this.menuStateService.saveLastSelectedSubcategory(producto.subcategoria_id);
      
      // Si también tenemos categoría, podemos expandirla
      if (producto.categoria_id) {
        this.menuStateService.expandCategory(producto.categoria_id);
      }
      
      console.log(`📌 Navegando desde grid-producto a subcategoria ${producto.subcategoria_id}`);
    }

    // Navegar a la URL
    if (producto.link) {
      this.router.navigateByUrl(producto.link);
    }
  }

  
// Agregar estos métodos al componente
@HostListener('document:touchstart', ['$event'])
@HostListener('document:click', ['$event'])
onOutsideClick(event: Event) {
  if (this.hoveredIndex !== null) {
    const target = event.target as HTMLElement;
    const isPuntoMedio = target.closest('.punto-medio');
    const isInfoExtra = target.closest('.info-extra');
    const isCloseButton = target.closest('.close-modal');
    
    if (!isPuntoMedio && !isInfoExtra && !isCloseButton) {
      this.setHoveredIndex(null);
    }
  }
}

// También puedes agregar soporte para gestos táctiles
@HostListener('window:resize')
onResize() {
  // Cerrar modal al rotar pantalla en móvil
  if (window.innerWidth <= 767) {
    this.setHoveredIndex(null);
  }
}
}