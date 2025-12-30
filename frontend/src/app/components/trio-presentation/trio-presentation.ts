import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ContentCard } from '../../models/content-card.model';

@Component({
  selector: 'app-plaxti-trio-presentation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trio-presentation.html',
  styleUrls: ['./trio-presentation.css']
})
export class PlaxtiTrioPresentationComponent {
  @Input() cards: ContentCard[] = [];
  @Input() backgroundColor: string = 'rgba(255, 255, 255, 0.98)';
  @Input() textColor: string = '#1a202c';
  @Input() cardHeight: string = '550px';
  @Input() gap: string = '40px';
  @Input() hoverEffect: boolean = true;
  @Input() layout: 'default' | 'alternate' | 'custom' = 'default';
  @Input() showHeader: boolean = false;
  @Input() headerTitle: string = 'Nuestros Servicios';
  @Input() headerSubtitle?: string;

  constructor(private sanitizer: DomSanitizer) {}

  // Obtener estilos dinámicos para la sección
  getSectionStyles(): SafeStyle {
    // Determinar si el fondo es claro u oscuro
    const isLightBg = this.isLightColor(this.backgroundColor);
    
    // Colores adaptables basados en el fondo
    const cardBg = isLightBg ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.05)';
    const borderColor = isLightBg ? 'rgba(226, 232, 240, 0.6)' : 'rgba(255, 255, 255, 0.1)';
    const overlayStart = isLightBg ? 'rgba(54, 140, 68, 0.8)' : 'rgba(0, 0, 0, 0.7)';
    const overlayMid = isLightBg ? 'rgba(37, 211, 102, 0.6)' : 'rgba(0, 0, 0, 0.4)';
    const overlayLight = isLightBg ? 'rgba(37, 211, 102, 0.2)' : 'rgba(0, 0, 0, 0.2)';
    const hoverBorder = isLightBg ? 'rgba(54, 140, 68, 0.2)' : 'rgba(255, 255, 255, 0.2)';
    const titleColor = isLightBg ? '#1a202c' : '#ffffff';
    const descriptionColor = isLightBg ? '#4a5568' : 'rgba(255, 255, 255, 0.9)';
    
    return this.sanitizer.bypassSecurityTrustStyle(`
      --bg-color: ${this.backgroundColor};
      --text-color: ${this.textColor};
      --card-bg: ${cardBg};
      --border-color: ${borderColor};
      --overlay-start: ${overlayStart};
      --overlay-mid: ${overlayMid};
      --overlay-light: ${overlayLight};
      --hover-border: ${hoverBorder};
      --title-color: ${titleColor};
      --description-color: ${descriptionColor};
      --gradient-primary: linear-gradient(90deg, #368c44, #25d366);
      --gradient-primary-light: linear-gradient(135deg, rgba(54, 140, 68, 0.1), rgba(37, 211, 102, 0.1));
    `);
  }

  // Determinar si un color hex es claro u oscuro
  private isLightColor(hexColor: string): boolean {
    // Si es un color rgba, extraer el color principal
    if (hexColor.includes('rgba')) {
      // Extraer los valores RGB del string rgba
      const matches = hexColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (matches) {
        const r = parseInt(matches[1], 10);
        const g = parseInt(matches[2], 10);
        const b = parseInt(matches[3], 10);
        
        // Calcular luminancia
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5;
      }
      return true; // Por defecto
    }
    
    // Para colores HEX
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return true;
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  // Determina el orden de contenido según el layout
  getCardLayout(index: number): 'image-text' | 'text-image' | 'image-text' {
    if (this.layout === 'alternate') {
      return index % 2 === 0 ? 'image-text' : 'text-image';
    } else if (this.layout === 'custom') {
      if (index === 0) return 'image-text';
      if (index === 1) return 'text-image';
      if (index === 2) return 'image-text';
    }
    return 'image-text';
  }

  // Navega al enlace si existe
  navigateToLink(link?: string): void {
    if (link) {
      window.open(link, '_blank');
    }
  }

  // Clase para la posición del texto
  getTextPositionClass(position?: 'top' | 'bottom' | 'center'): string {
    return position || 'center';
  }
}