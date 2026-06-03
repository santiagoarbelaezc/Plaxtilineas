import { Component, OnInit } from '@angular/core';
import { Producto, GridProductoComponent } from '../grid-producto';
import { ProductosService } from '../../../services/productos.service';
import { ProductoEditable } from '../../../models/producto.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-util-grid-producto-other',
  imports: [GridProductoComponent, CommonModule],
  templateUrl: './util-grid-producto-other.html',
  styleUrl: './util-grid-producto-other.css',
})
export class UtilGridProductoOther implements OnInit {

  productos: Producto[] = [];

  constructor(private productosService: ProductosService) {}

  ngOnInit(): void {
    this.productosService.obtenerProductosAleatorios(8).subscribe({
      next: (data: ProductoEditable[]) => {
        if (data && data.length > 0) {
          this.productos = data.map((prod, index) => {
            return {
              id: prod.id,
              imagen: prod.imagen_url || 'assets/placeholder.jpg', // Fallback en caso de que no tenga imagen
              descripcion: prod.descripcion || '',
              nombre: prod.nombre,
              precio: prod.precio,
              link: `/producto/${prod.id}`, // Enlace directo a la página del producto
              subcategoria_id: prod.subcategoria_id,
              altura: index % 2 === 0 ? 'baja' : 'alta' // Alternar altura para el efecto masonry (Mosaico)
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
