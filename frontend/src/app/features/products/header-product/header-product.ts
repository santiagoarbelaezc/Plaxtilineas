import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header-product',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-product.html',
  styleUrls: ['./header-product.css']
})
export class HeaderProduct implements AfterViewInit, OnDestroy {
  images = [
    {
      src: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766543172/ChatGPT_Image_Dec_23_2025_09_15_40_PM_d22wwm.png',
      alt: 'Productos premium 1'
    },
    {
      src: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766543171/ChatGPT_Image_Dec_23_2025_09_19_16_PM_ogcdlr.png',
      alt: 'Productos premium 2'
    },
    {
      src: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766543170/ChatGPT_Image_Dec_23_2025_09_24_30_PM_ycobgr.png',
      alt: 'Productos premium 3'
    }
  ];

  selectedIndex: number = 0;
  autoIndex: number = 0;
  private autoInterval: any;
  private isManualNavigation: boolean = false;
  private manualNavigationTimeout: any;

  ngAfterViewInit(): void {
    this.startAutoCarousel();
  }

  // Navegación manual con flechas del teclado
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      this.previousImage();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.nextImage();
      event.preventDefault();
    }
  }

  // Método para seleccionar imagen manualmente
  onImageSelect(index: number): void {
    this.manualNavigation(index);
  }

  // Método público para siguiente imagen
  nextImage(): void {
    const nextIndex = (this.selectedIndex + 1) % this.images.length;
    this.manualNavigation(nextIndex);
  }

  // Método público para imagen anterior
  previousImage(): void {
    const prevIndex = (this.selectedIndex - 1 + this.images.length) % this.images.length;
    this.manualNavigation(prevIndex);
  }

  // Método para navegación manual
  private manualNavigation(index: number): void {
    // Actualizar índices
    this.selectedIndex = index;
    this.autoIndex = index;
    
    // Marcar como navegación manual
    this.isManualNavigation = true;
    
    // Reiniciar el timeout de navegación manual
    this.resetManualNavigationTimeout();
    
    // Reiniciar el carrusel automático
    this.resetAutoCarousel();
  }

  // Resetear el timeout de navegación manual
  private resetManualNavigationTimeout(): void {
    if (this.manualNavigationTimeout) {
      clearTimeout(this.manualNavigationTimeout);
    }
    
    // Después de 10 segundos, permitir que el carrusel automático continúe
    this.manualNavigationTimeout = setTimeout(() => {
      this.isManualNavigation = false;
    }, 10000); // 10 segundos de pausa después de navegación manual
  }

  private resetAutoCarousel(): void {
    // Limpiar intervalo existente
    if (this.autoInterval) {
      clearInterval(this.autoInterval);
    }
    
    // Reiniciar después de 10 segundos
    setTimeout(() => {
      this.startAutoCarousel();
    }, 10000); // Pausa de 10 segundos después de selección manual
  }

  private startAutoCarousel(): void {
    this.autoInterval = setInterval(() => {
      // Si no hay navegación manual activa, avanzar automáticamente
      if (!this.isManualNavigation) {
        const nextIndex = (this.autoIndex + 1) % this.images.length;
        
        // Actualizar ambos índices para mantener sincronización
        this.autoIndex = nextIndex;
        this.selectedIndex = nextIndex;
      }
    }, 10000); // Cambia cada 10 segundos (ajustado de 9000 a 10000)
  }

  ngOnDestroy(): void {
    if (this.autoInterval) {
      clearInterval(this.autoInterval);
    }
    
    if (this.manualNavigationTimeout) {
      clearTimeout(this.manualNavigationTimeout);
    }
  }
}