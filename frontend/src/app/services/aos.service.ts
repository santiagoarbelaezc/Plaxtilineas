import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as AOS from 'aos';

@Injectable({
  providedIn: 'root'
})
export class AosService {
  private initialized = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {}

  init() {
    if (isPlatformBrowser(this.platformId) && !this.initialized) {
      // Ejecutar fuera de Angular Zone para mejor performance
      this.ngZone.runOutsideAngular(() => {
        AOS.init({
          duration: 800,
          easing: 'ease-in-out',
          once: true,
          mirror: false,
          offset: 50, // Reducido para que se active más temprano
          delay: 50,
          disable: false, // SIEMPRE habilitado
          startEvent: 'DOMContentLoaded', // Esperar a que el DOM esté listo
          throttleDelay: 99, // Optimización de performance
          debounceDelay: 50
        });
        
        this.initialized = true;
        console.log('🎯 AOS inicializado con éxito');
      });
    }
  }

  refresh() {
    if (isPlatformBrowser(this.platformId)) {
      // Ejecutar dentro de Angular Zone para asegurar detección de cambios
      this.ngZone.run(() => {
        setTimeout(() => {
          if (AOS) {
            AOS.refresh();
            console.log('🔄 AOS refrescado');
          }
        }, 100);
      });
    }
  }

  refreshHard() {
    if (isPlatformBrowser(this.platformId)) {
      if (AOS && AOS.refreshHard) {
        AOS.refreshHard();
        console.log('🔄 AOS refreshHard ejecutado');
      }
    }
  }
}