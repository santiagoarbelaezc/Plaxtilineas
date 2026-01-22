import { Component, Input } from '@angular/core';
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
}