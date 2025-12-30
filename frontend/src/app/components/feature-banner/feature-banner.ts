import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-feature-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './feature-banner.html',
  styleUrls: ['./feature-banner.css']
})
export class FeatureBanner implements OnInit {
  @Input() imageUrl: string = '';
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() primaryText: string = 'Conocer más';
  
  // Propiedades para el enlace
  @Input() buttonLink: string | null = null;
  @Input() queryParams: any = null;
  @Input() linkTarget: string = '_self';
  @Input() isExternalLink: boolean = false;
  
  @Input() reverse: boolean = false;
  @Input() backgroundColor: string = 'rgba(255, 255, 255, 0.98)';
  @Input() textColor: string = '#1a202c';
  @Input() buttonColor: string = '#368c44';
  @Input() buttonHoverColor: string = '#2a6b35';
  @Input() buttonTextColor: string = '#ffffff';
  
  @Output() primaryClick = new EventEmitter<void>();
  @Output() imageLoaded = new EventEmitter<void>();

  constructor(private menuStateService: MenuStateService) {}

  ngOnInit(): void {}

  getQueryString(): string {
    if (!this.queryParams) return '';
    
    const params = new URLSearchParams();
    for (const key in this.queryParams) {
      if (this.queryParams.hasOwnProperty(key)) {
        params.set(key, this.queryParams[key]);
      }
    }
    return params.toString();
  }

  getButtonStyles(): any {
    const isLightColor = this.isColorLight(this.buttonColor);
    const hoverColor = this.buttonHoverColor || this.darkenColor(this.buttonColor, 20);
    
    return {
      'background': `linear-gradient(135deg, ${this.buttonColor} 0%, ${this.darkenColor(this.buttonColor, 10)} 100%)`,
      'color': this.buttonTextColor,
      '--button-hover-color': hoverColor,
      '--button-text-color': this.buttonTextColor,
      '--button-hover-text-color': isLightColor ? '#1a202c' : '#ffffff',
      '--button-shadow-color': this.buttonColor + '40'
    };
  }

  private isColorLight(color: string): boolean {
    let r: number, g: number, b: number;
    
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
      const rgb = color.match(/\d+/g);
      if (rgb) {
        r = parseInt(rgb[0]);
        g = parseInt(rgb[1]);
        b = parseInt(rgb[2]);
      } else {
        return true;
      }
    } else {
      return true;
    }
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  private darkenColor(color: string, percent: number): string {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      const factor = 1 - (percent / 100);
      const newR = Math.max(0, Math.min(255, Math.floor(r * factor)));
      const newG = Math.max(0, Math.min(255, Math.floor(g * factor)));
      const newB = Math.max(0, Math.min(255, Math.floor(b * factor)));
      
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    return color;
  }

  onPrimaryClick(): void {
    // Emitir el evento primero
    this.primaryClick.emit();
    
    // GUARDAR EXPLÍCITAMENTE LA SUBCATEGORÍA 6 EN EL SERVICIO
    if (this.queryParams && this.queryParams.subcategoria_id) {
      const subcategoriaId = this.queryParams.subcategoria_id;
      this.menuStateService.saveLastSelectedSubcategory(subcategoriaId);
    }
    
    // Si no hay enlace configurado, solo emitir el evento
    if (!this.buttonLink) {
      return;
    }
  }

  onImageLoad(): void {
    this.imageLoaded.emit();
  }

  onButtonHover(isHovering: boolean): void {
    const button = document.querySelector('.feature-btn.primary') as HTMLElement;
    if (button) {
      if (isHovering) {
        button.style.transform = 'translateY(-4px)';
      } else {
        button.style.transform = 'translateY(0)';
      }
    }
  }
}