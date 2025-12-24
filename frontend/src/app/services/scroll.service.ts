// src/app/services/scroll.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private isBrowser: boolean;
  private previousUrl: string = '';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.initScrollBehavior();
    }
  }

  private initScrollBehavior(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const newUrl = event.urlAfterRedirects || event.url;
      const oldUrl = this.previousUrl;
      
      console.log(`🔄 Navegación: ${oldUrl || '(inicio)'} -> ${newUrl}`);
      
      // Solo hacer scroll al top si es un cambio REAL de ruta (no solo query params)
      if (this.isRealRouteChange(oldUrl, newUrl)) {
        console.log(`✅ Scroll al top - Cambio REAL de ruta`);
        this.scrollToTopInstant();
      } else {
        console.log(`⚠️ Sin scroll - Solo cambio de query params o fragmento`);
      }
      
      this.previousUrl = newUrl;
    });
  }

  /**
   * Determina si es un cambio REAL de ruta (no solo query params o fragmento)
   */
  private isRealRouteChange(oldUrl: string, newUrl: string): boolean {
    // Si es la primera navegación, siempre hacer scroll al top
    if (!oldUrl) return true;
    
    // Extraer el path sin query params y sin fragmentos
    const getCleanPath = (url: string): string => {
      // Remover query params (?) y fragmentos (#)
      const withoutQueryAndHash = url.split('?')[0].split('#')[0];
      return withoutQueryAndHash;
    };
    
    const oldPath = getCleanPath(oldUrl);
    const newPath = getCleanPath(newUrl);
    
    // Solo es un cambio real si el path (sin query params) cambió
    return oldPath !== newPath;
  }

  /**
   * Hacer scroll instantáneo al top (sin animación)
   */
  scrollToTopInstant(): void {
    if (!this.isBrowser) return;

    console.log('⬆️ Ejecutando scrollToTopInstant...');
    
    // Desactivar temporalmente el scroll suave
    const html = document.documentElement;
    const originalScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    
    // Hacer scroll al top
    window.scrollTo(0, 0);
    html.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Restaurar el comportamiento original
    setTimeout(() => {
      html.style.scrollBehavior = originalScrollBehavior;
    }, 0);
  }

  /**
   * Hacer scroll suave al top
   */
  scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
    if (!this.isBrowser) return;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: behavior
    });
  }

  /**
   * Hacer scroll a un elemento específico por ID
   */
  scrollToElement(elementId: string, offset: number = 80, behavior: ScrollBehavior = 'smooth'): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: behavior
        });
        
        console.log(`📍 Scroll al elemento: #${elementId}`);
      }
    }, 100);
  }

  /**
   * Obtener posición actual del scroll
   */
  getScrollPosition(): number {
    if (!this.isBrowser) return 0;
    
    return window.pageYOffset || 
           document.documentElement.scrollTop || 
           document.body.scrollTop || 0;
  }
}