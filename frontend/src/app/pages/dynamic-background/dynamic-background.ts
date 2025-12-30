import { Component, OnInit, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importa tus componentes
import { Partners } from '../../components/partners/partners.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from '../../components/social-buttons/social-buttons.component';
import { LongMap } from '../../components/long-map/long-map.component';
import { CategoriasDestacadasComponent } from '../../components/categorias-destacadas/categorias-destacadas.component';
import { FeatureBanner } from '../../components/feature-banner/feature-banner';
import { PlaxtiTrioPresentationComponent } from '../../components/trio-presentation/trio-presentation';
import { PlaxtiBannerComponent } from '../../components/banner/banner';

import { ContentCard } from '../../models/content-card.model';
import { BannerImage } from '../../components/banner/banner';
import { FeatureNewProducts } from '../../components/feature-new-products/feature-new-products';

@Component({
  selector: 'app-dynamic-background',
  standalone: true,
  imports: [
    CommonModule,
    Partners,
    Footer,
    SocialButtonsComponent,
    LongMap,
    CategoriasDestacadasComponent,
    FeatureBanner,
    PlaxtiTrioPresentationComponent,
    PlaxtiBannerComponent,
    FeatureNewProducts
  ],
  templateUrl: './dynamic-background.html',
  styleUrls: ['./dynamic-background.css']
})
export class DynamicBackgroundComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @ViewChild('dynamicBackground') dynamicBackground!: ElementRef;
  
  // Paleta de colores para PlaxtiLineas
  colorPalette: string[] = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000'];
  
  // Nombres de los colores para el indicador
  colorNames: string[] = ['Blanco Inicio', 'Blanco Contenido', 'Verde Principal', 'Verde Oscuro', 'Negro Valores', 'Negro Servicios', 'Blanco Final', 'Blanco Final'];
  
  // Configuración actual
  showColorIndicator: boolean = true;
  currentColorIndex: number = 0;
  private colorSections: HTMLElement[] = [];
  private scrollProgress: number = 0;
  private rafId: number | null = null;
  private lastScrollTop: number = 0;
  private scrollTimeout: any;
  private isScrolling: boolean = false;

  // Datos actualizados con texto más modesto y amigable
bannerImages: BannerImage[] = [
  {
    url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767030291/ChatGPT_Image_Dec_29_2025_12_10_23_AM_msuluw.png',
    alt: 'Consultoría en Plaxtilineas',
    title: 'Asesoría Personalizada',
    description: 'Te ayudamos a elegir los mejores materiales para tus proyectos, con recomendaciones prácticas y útiles.',
    link: '/contacto',
    category: 'Asesoría'
  },
  {
    url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767035836/ChatGPT_Image_29_dic_2025_14_14_51_kgzzi5.png',
    alt: 'Entrega de productos Plaxtilineas',
    title: 'Llegamos hasta tu negocio',
    description: 'Te entregamos plásticos, espumas, mimbres, mallas y sogas justo cuando los necesitas.',
    link: '/contacto',
    category: 'Entrega'
  },
  {
    url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767035505/banner1_qz3b3m.png',
    alt: 'Atención al cliente Plaxtilineas',
    title: 'Estamos aquí para ayudarte',
    description: 'Si tienes dudas sobre nuestros productos, estamos disponibles para orientarte.',
    link: '/contacto',
    category: 'Ayuda'
  },
  {
    url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767030284/ChatGPT_Image_29_dic_2025_12_43_40_kcvskq.png',
    alt: 'Productos Plaxtilineas',
    title: 'Materiales de confianza',
    description: 'Plásticos, espumas, mimbres, mallas y sogas que necesitas para tu trabajo diario.',
    link: '/productos',
    category: 'Materiales'
  }
];

  valoresCards: ContentCard[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Calidad certificada',
      title: 'Excelencia en Calidad',
      description: 'Compromiso con los más altos estándares en todos nuestros productos y servicios.',
      link: '/calidad',
      textPosition: 'bottom'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Innovación constante',
      title: 'Innovación Continua',
      description: 'Buscamos constantemente nuevas soluciones para mejorar procesos y resultados.',
      link: '/innovacion',
      textPosition: 'center'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Compromiso con el cliente',
      title: 'Compromiso Total',
      description: 'Dedicación absoluta a satisfacer y superar las expectativas de nuestros clientes.',
      link: '/compromiso',
      textPosition: 'top'
    }
  ];

  serviciosCards: ContentCard[] = [
    {
      imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767030291/ChatGPT_Image_Dec_29_2025_12_10_23_AM_msuluw.png',
      altText: 'Venta de insumos industriales',
      title: 'Venta de Insumos',
      description: 'Amplio catálogo de productos esenciales para la industria con calidad garantizada.',
      link: '/productos',
      textPosition: 'bottom'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767035836/ChatGPT_Image_29_dic_2025_14_14_51_kgzzi5.png',
      altText: 'Distribución logística',
      title: 'Logística y Distribución',
      description: 'Servicio de distribución eficiente y puntual a lo largo de todo el territorio nacional.',
      link: '/contacto',
      textPosition: 'center'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767035505/banner1_qz3b3m.png',
      altText: 'Asesoramiento técnico',
      title: 'Asesoría Técnica',
      description: 'Expertos disponibles para brindar soluciones personalizadas a tus necesidades.',
      link: '/contacto',
      textPosition: 'bottom'
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // Inicialización simple
  }

  ngAfterViewInit(): void {
    // Inicializar las secciones de color
    setTimeout(() => {
      this.colorSections = Array.from(this.dynamicBackground.nativeElement.querySelectorAll('.color-section'));
      this.startScrollAnimation();
    }, 100);
  }

  ngOnDestroy(): void {
    this.stopScrollAnimation();
  }

  // CORRECCIÓN AQUÍ: Quitar el ['$event'] ya que el scroll no pasa eventos
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isScrolling) return;
    
    this.isScrolling = true;
    this.updateScrollProgress();
    
    // Debounce para mejor rendimiento
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 50);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // Recargar secciones en resize
    this.colorSections = Array.from(this.dynamicBackground.nativeElement.querySelectorAll('.color-section'));
  }

  private startScrollAnimation(): void {
    const update = () => {
      if (!this.isScrolling) {
        this.updateScrollProgress();
        this.updateBackgroundColor();
      }
      this.rafId = requestAnimationFrame(update);
    };
    this.rafId = requestAnimationFrame(update);
  }

  private stopScrollAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private updateScrollProgress(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    if (docHeight <= 0) return;
    
    this.scrollProgress = Math.max(0, Math.min(1, scrollTop / docHeight));
    
    // Calcular el índice del color actual basado en las secciones visibles
    if (this.colorSections.length > 0) {
      const viewportMiddle = scrollTop + (window.innerHeight / 2);
      
      for (let i = 0; i < this.colorSections.length; i++) {
        const section = this.colorSections[i];
        const rect = section.getBoundingClientRect();
        const sectionTop = scrollTop + rect.top;
        const sectionBottom = sectionTop + rect.height;
        
        if (viewportMiddle >= sectionTop && viewportMiddle <= sectionBottom) {
          this.currentColorIndex = i;
          break;
        }
      }
    }
  }

  private updateBackgroundColor(): void {
    if (!this.colorSections.length || !this.dynamicBackground) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (documentHeight <= windowHeight) return;
    
    const scrollPosition = Math.max(0, Math.min(1, scrollTop / (documentHeight - windowHeight)));
    const colorValue = this.calculateColorFromScroll(scrollPosition);
    
    // Aplicar el color al fondo dinámico
    requestAnimationFrame(() => {
      this.dynamicBackground.nativeElement.style.backgroundColor = colorValue;
      document.documentElement.style.setProperty('--dynamic-bg-color', colorValue);
      
      // Actualizar el color de texto según el fondo
      this.updateTextColorBasedOnBackground(colorValue);
    });
  }

  private calculateColorFromScroll(scrollProgress: number): string {
    if (scrollProgress >= 1) return this.colorPalette[this.colorPalette.length - 1];
    
    const sectionIndex = Math.floor(scrollProgress * (this.colorPalette.length - 1));
    const sectionProgress = (scrollProgress * (this.colorPalette.length - 1)) - sectionIndex;
    
    if (sectionIndex >= this.colorPalette.length - 1) {
      return this.colorPalette[this.colorPalette.length - 1];
    }
    
    const startColor = this.hexToRgb(this.colorPalette[sectionIndex]);
    const endColor = this.hexToRgb(this.colorPalette[sectionIndex + 1]);
    
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * sectionProgress);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * sectionProgress);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * sectionProgress);
    
    return `rgb(${r}, ${g}, ${b})`; // Más eficiente que hex para transitions
  }

  private updateTextColorBasedOnBackground(bgColor: string): void {
    // Extraer valores RGB de la cadena rgb(r, g, b)
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!rgbMatch) return;
    
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Si el fondo es oscuro, usar texto claro, y viceversa
    const textColor = luminance > 0.6 ? '#000000' : '#FFFFFF';
    document.documentElement.style.setProperty('--dynamic-text-color', textColor);
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    hex = hex.replace(/^#/, '');
    
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  getColorName(color: string): string {
    const index = this.colorPalette.indexOf(color);
    return index !== -1 ? this.colorNames[index] : 'Color';
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
      
      // Actualizar el color inmediatamente
      setTimeout(() => {
        this.updateScrollProgress();
        this.updateBackgroundColor();
      }, 300);
    }
  }

  toggleColorIndicator(): void {
    this.showColorIndicator = !this.showColorIndicator;
  }
}