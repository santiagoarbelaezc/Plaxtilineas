import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Producto {
  id: number;
  imagen: string;
  descripcion: string;
  link: string;
  altura: 'alta' | 'baja';
  nombre?: string;
  precio?: number;
}

@Component({
  selector: 'app-grid-producto',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grid-producto.html',
  styleUrls: ['./grid-producto.css']
})
export class GridProductoComponent {
  @Input() productos: Producto[] = [];
  hoveredIndex: number | null = null;
  
  get primeraFila(): Producto[] {
    return this.productos.slice(0, 4);
  }
  
  get segundaFila(): Producto[] {
    return this.productos.slice(4, 8);
  }

  formatearPrecio(precio?: number): string {
    if (!precio) return '';
    return `$${precio.toLocaleString('es-CO')}`;
  }

  setHoveredIndex(index: number | null): void {
    this.hoveredIndex = index;
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