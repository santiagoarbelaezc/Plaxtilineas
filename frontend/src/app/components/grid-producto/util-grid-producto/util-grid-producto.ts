import { Component } from '@angular/core';
import { GridProductoComponent, Producto } from '../grid-producto';


@Component({
  selector: 'app-util-grid-producto',
  imports: [GridProductoComponent],
  templateUrl: './util-grid-producto.html',
  styleUrl: './util-grid-producto.css',
})
export class UtilGridProducto {
  productos: Producto[] = [
    {
      id: 1,
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766975482/ChatGPT_Image_Dec_28_2025_08_43_47_PM_o831lq.png',
      descripcion: 'Malla plástica de alta resistencia',
      nombre: 'Malla Plástica Naranja',
      precio: 89900,
      link: '/productos?categoria=mallas',
      altura: 'baja'
    },
    {
      id: 2,
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446215/yumbo-img2_aef0kj.jpg',
      descripcion: 'Aislante acústico y térmico de alta calidad',
      nombre: 'Yumbolón Negro',
      precio: 129000,
      link: '/productos?categoria=aislantes',
      altura: 'alta'
    },
    {
      id: 3,
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446214/piso-img3_iig906.jpg',
      descripcion: 'Papel para colgadura decorativa',
      nombre: 'Papel de Colgadura',
      precio: 45900,
      link: '/productos?categoria=papeles',
      altura: 'baja'
    },
    {
      id: 4,
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767412446/card-template3_iwmedg.jpg',
      descripcion: 'Aislante reflectante plateado',
      nombre: 'Yumbolón Plateado',
      precio: 145000,
      link: '/productos?categoria=aislantes',
      altura: 'alta'
    },
    {
      id: 5,
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448902/mimbre-img3_htk1uk.jpg',
      descripcion: 'Silla de mimbre estilo vintage',
      nombre: 'Silla en Mimbre',
      precio: 189900,
      link: '/productos?categoria=muebles',
      altura: 'alta'
    },
    {
      id: 6,
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448887/espuma-img2_geau97.jpg',
      descripcion: 'Espuma de poliuretano naranja',
      nombre: 'Espuma Naranja',
      precio: 75900,
      link: '/productos?categoria=espumas',
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
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448898/mimbre-img_gcvoyc.jpg',
      descripcion: 'Set de sillas de mimbre para terraza',
      nombre: 'Sillas en Mimbre',
      precio: 110900,
      link: '/productos?categoria=muebles',
      altura: 'baja'
    }
  ];
}