import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProductoBackgroundImage {
  url: string;
  alt: string;
  title?: string;
  description?: string;
  link?: string;
}

@Component({
  selector: 'app-producto-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto-background.html',
  styleUrl: './producto-background.css'
})
export class ProductoBackgroundComponent {
  @Input() titulo: string = '';
  @Input() imagenes: ProductoBackgroundImage[] = [];
  @Input() height: string = '400px'; // Altura más pequeña que el banner
  @Input() hoverScale: number = 1.2; // Escala al hacer hover
  @Input() hoverTransition: string = '0.5s cubic-bezier(0.23, 1, 0.32, 1)';
  @Input() minScale: number = 0.9; // Escala mínima de las imágenes no hover
  @Input() showGradient: boolean = true; // Mostrar gradiente verde característico
  
  hoveredIndex: number | null = null;

  // Calcula el tamaño y transformación de cada imagen (3 imágenes fijas)
  getImageStyle(index: number): any {
    const numImages = 3; // Siempre 3 imágenes
    
    if (this.hoveredIndex === null) {
      // Estado normal: todas iguales
      return {
        flex: '1 0 auto',
        width: `${100 / numImages}%`,
        transform: 'scale(1)',
        transition: this.hoverTransition,
        zIndex: '1',
        position: 'relative'
      };
    }
    
    if (index === this.hoveredIndex) {
      // Imagen hover: se agranda
      return {
        flex: '1 0 auto',
        width: `${(100 / numImages) * this.hoverScale}%`,
        transform: 'scale(1)',
        transition: this.hoverTransition,
        zIndex: '10',
        position: 'relative'
      };
    } else {
      // Otras imágenes: se reducen
      return {
        flex: '1 0 auto',
        width: `${(100 / numImages) * this.minScale}%`,
        transform: 'scale(0.95)',
        transition: this.hoverTransition,
        zIndex: '1',
        position: 'relative'
      };
    }
  }

  onMouseEnter(index: number): void {
    this.hoveredIndex = index;
  }

  onMouseLeave(): void {
    this.hoveredIndex = null;
  }

  // Si la imagen tiene link, navega
  onClick(image: ProductoBackgroundImage): void {
    if (image.link) {
      window.open(image.link, '_blank');
    }
  }
}
