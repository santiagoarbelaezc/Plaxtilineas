import { Component, OnInit } from '@angular/core';
import { GridProductoComponent, Producto } from '../grid-producto';
import { ProductosService } from '../../../../services/productos.service';
import { ProductoEditable } from '../../../../models/producto.model';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-util-grid-producto',
  imports: [GridProductoComponent, CommonModule],
  templateUrl: './util-grid-producto.html',
  styleUrl: './util-grid-producto.css',
})
export class UtilGridProducto implements OnInit {
  productos: Producto[] = [];

  constructor(private productosService: ProductosService) {}

  ngOnInit(): void {
    this.productosService.obtenerProductosAleatorios(8).subscribe({
      next: (data: ProductoEditable[]) => {
        if (data && data.length > 0) {
          this.productos = data.map((prod, index) => {
            return {
              id: prod.id,
              imagen: prod.imagen_url || 'assets/placeholder.jpg',
              descripcion: prod.descripcion || '',
              nombre: prod.nombre,
              precio: prod.precio,
              link: `/producto/${prod.id}`,
              subcategoria_id: prod.subcategoria_id,
              altura: index % 2 === 0 ? 'baja' : 'alta'
            };
          });
        }
      },
      error: (error) => {
        console.error('Error al obtener productos aleatorios para la grilla:', error);
      }
    });
  }
}