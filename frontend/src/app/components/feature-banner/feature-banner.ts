import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import AOS from 'aos';
import { MenuStateService } from '../../services/menu-state.service';
// Asegúrate de importar el servicio - ajusta la ruta según tu proyecto


@Component({
  selector: 'app-feature-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './feature-banner.html',
  styleUrls: ['./feature-banner.css']
})
export class FeatureBanner implements OnInit, OnDestroy {
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

  private aosInitialized = false;
  private resizeObserver: ResizeObserver | null = null;
  isMobile: boolean = false;

  // 1. INYECTAR EL SERVICIO EN EL CONSTRUCTOR
  constructor(private menuStateService: MenuStateService) {}

  ngOnInit(): void {
    this.checkIfMobile();
    this.initAOS();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    if (this.aosInitialized) {
      AOS.refreshHard();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkIfMobile();
    if (this.aosInitialized) {
      AOS.refresh();
    }
  }

  private checkIfMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private setupResizeObserver(): void {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.aosInitialized) {
          AOS.refresh();
        }
      });
      
      const container = document.querySelector('.feature-banner-container');
      if (container) {
        this.resizeObserver.observe(container);
      }
    }
  }

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

  private initAOS(): void {
    if (typeof window !== 'undefined') {
      AOS.init({
        duration: 800,
        once: true,
        offset: 100,
        easing: 'ease-in-out-cubic',
        disable: this.isMobile ? 'phone' : false,
        startEvent: 'DOMContentLoaded',
        initClassName: 'aos-init',
        animatedClassName: 'aos-animate',
        useClassNames: false,
        disableMutationObserver: false,
        debounceDelay: 50,
        throttleDelay: 99,
        mirror: false,
        anchorPlacement: 'top-bottom'
      });
      this.aosInitialized = true;
      
      setTimeout(() => {
        AOS.refreshHard();
      }, 300);
    }
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

  // 2. MODIFICAR EL MÉTODO onPrimaryClick() EXPLÍCITAMENTE
  onPrimaryClick(): void {
    // Emitir el evento primero
    this.primaryClick.emit();
    
    // GUARDAR EXPLÍCITAMENTE LA SUBCATEGORÍA 6 EN EL SERVICIO
    if (this.queryParams && this.queryParams.subcategoria_id) {
      // Extraer el valor de subcategoria_id del queryParams
      const subcategoriaId = this.queryParams.subcategoria_id;
      
      // Guardarlo en el servicio
      this.menuStateService.saveLastSelectedSubcategory(subcategoriaId);
      
      console.log(`📌 SUBCATEGORÍA EXPLÍCITA GUARDADA: ID ${subcategoriaId}`);
      console.log(`📍 Este es el banner de Mallas Plásticas que usa subcategoría 6`);
    }
    
    // Si no hay enlace configurado, solo emitir el evento
    if (!this.buttonLink) {
      console.log('Primary button clicked - no link configured');
      return;
    }
    
    console.log(`Primary button clicked - link: ${this.buttonLink}`);
  }

  onImageLoad(): void {
    this.imageLoaded.emit();
    if (this.aosInitialized) {
      AOS.refresh();
    }
  }

  onButtonHover(isHovering: boolean): void {
    const button = document.querySelector('.feature-btn.primary') as HTMLElement;
    if (button) {
      if (isHovering) {
        button.style.transform = 'translateY(-4px) translateZ(20px)';
      } else {
        button.style.transform = 'translateY(0) translateZ(0)';
      }
    }
  }

  refreshAOS(): void {
    if (this.aosInitialized) {
      AOS.refreshHard();
    }
  }
}