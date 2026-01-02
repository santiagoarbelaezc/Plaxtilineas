import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.css'
})
export class Card {
  @Input() precio: string = '';
  @Input() nombreProducto: string = '';
  @Input() imagenProducto: string = '';
  
  // URL del logo de la empresa
  logoUrl: string = 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767224962/logo-peque%C3%B1o_mrokec.png';
  
  // Imagen de respaldo en caso de error
  defaultImage: string = 'https://via.placeholder.com/250x200/6c757d/ffffff?text=Producto';
  
  // Manejo de error en la imagen
  handleImageError(event: any) {
    event.target.src = this.defaultImage;
    event.target.alt = 'Imagen no disponible';
  }
}