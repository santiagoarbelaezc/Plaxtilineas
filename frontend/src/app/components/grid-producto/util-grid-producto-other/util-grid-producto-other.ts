import { Component } from '@angular/core';
import { Producto, GridProductoComponent } from '../grid-producto';

@Component({
  selector: 'app-util-grid-producto-other',
  imports: [GridProductoComponent],
  templateUrl: './util-grid-producto-other.html',
  styleUrl: './util-grid-producto-other.css',
})
export class UtilGridProductoOther {

  productos: Producto[] = [
      {
        id: 1,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448897/malla-img3_umwtgi.jpg',
        descripcion: 'Malla plástica de alta resistencia',
        nombre: 'Malla Plástica Azul',
        precio: 89900,
        link: '/productos?categoria=mallas',
        altura: 'baja'
      },
      {
        id: 2,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448902/mimbre-img2_lnw60f.jpg',
        descripcion: 'Silla de mimbre estilo vintage',
        nombre: 'Silla Mimbre Vintage',
        precio: 129000,
        link: '/productos?categoria=aislantes',
        altura: 'alta'
      },
      {
        id: 3,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1769099535/piso2_bvskat.jpg',
        descripcion: 'Piso',
        nombre: 'Piso Multifuncional',
        precio: 45900,
        link: '/productos?categoria=papeles',
        altura: 'baja'
      },
      {
        id: 4,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448886/espuma-img_jwvz5l.jpg',
        descripcion: 'Espuma de poliuretano',
        nombre: 'Espuma Negra',
        precio: 145000,
        link: '/productos?categoria=aislantes',
        altura: 'alta'
      },
      {
        id: 5,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1769099533/piso3_go1wyr.jpg',
        
        descripcion: 'Silla de mimbre estilo vintage',
        nombre: 'Silla en Mimbre',
        precio: 189900,
        link: '/productos?categoria=muebles',
        altura: 'alta'
      },
      {
        id: 6,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448898/mimbre-img_gcvoyc.jpg',
        descripcion: 'Silla de mimbre estilo vintage',
        nombre: 'Silla de Mimbre Vintage',
        precio: 75900,
        link: '/productos?categoria=papeles',
        altura: 'alta'
      },
      {
        id: 7,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446214/piso-img1_v5gmze.jpg',
        descripcion: 'Papel decorativo para paredes',
        nombre: 'Papel Colgadura Decorativo',
        precio: 52900,
        link: '/productos?categoria=papeles',
        altura: 'baja'
      },
      {
        id: 8,
        imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1769099829/mantel_zp5vph.jpg',
        descripcion: 'Mantel para comedor',
        nombre: 'Mantel para Comedor',
        precio: 425000,
        link: '/productos?categoria=muebles',
        altura: 'baja'
      }
    ];

}
