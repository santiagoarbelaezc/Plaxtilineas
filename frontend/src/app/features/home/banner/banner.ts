import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

export interface BannerImage {
  url: string;
  alt: string;
  title?: string;
  description?: string;
  link?: string;
  category?: string;
}

@Component({
  selector: 'app-plaxti-banner',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './banner.html',
  styleUrls: ['./banner.css']
})
export class PlaxtiBannerComponent {
  constructor(private router: Router) {}
  @Input() images: BannerImage[] = [];
  @Input() height: string = '600px'; // Altura ajustada para PlaxtiLineas
  @Input() hoverScale: number = 1.2; // Escala al hacer hover
  @Input() hoverTransition: string = '0.5s cubic-bezier(0.23, 1, 0.32, 1)';
  @Input() minScale: number = 0.9; // Escala mínima de las imágenes no hover
  @Input() showGradient: boolean = true; // Mostrar gradiente verde característico
  
  // Nuevas propiedades de diseño
  @Input() showHeader: boolean = false;
  @Input() headerTitle: string = 'Nuestras <span>Soluciones</span>';
  @Input() headerSubtitle: string = '';
  @Input() fullWidth: boolean = true; // Si es true, ocupa todo el ancho y no tiene gap
  @Input() useFaIcon: boolean = false; // Usar FontAwesome para el ícono
  
  hoveredIndex: number | null = null;

  // Calcula el tamaño y transformación de cada imagen con proporciones fluidas
  getImageStyle(index: number): any {
    const total = this.images?.length || 4;
    if (this.hoveredIndex === null) {
      // Estado normal: distribución equitativa
      return {
        flex: '1 1 0%',
        width: `${100 / total}%`,
        transform: 'scale(1)',
        transition: this.hoverTransition,
        zIndex: 1,
        position: 'relative'
      };
    }
    
    if (index === this.hoveredIndex) {
      // Imagen expandida en hover
      return {
        flex: '2.5 1 0%',
        width: '46%',
        transform: 'scale(1)',
        transition: this.hoverTransition,
        zIndex: 10,
        position: 'relative'
      };
    } else {
      // Otras imágenes comprimidas armónicamente
      return {
        flex: '0.8 1 0%',
        width: `${(100 - 46) / (total - 1)}%`,
        transform: 'scale(0.98)',
        transition: this.hoverTransition,
        zIndex: 1,
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

  // Si la imagen tiene link, navega usando el router de Angular
  onClick(image: BannerImage): void {
    if (image.link) {
      this.router.navigateByUrl(image.link);
    }
  }
}