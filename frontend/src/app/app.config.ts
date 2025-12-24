import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { ScrollService } from './services/scroll.service';
import { MenuStateService } from './services/menu-state.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
   
    // ⭐⭐ IMPORTANTE: Deshabilitar el scroll de Angular ⭐⭐
    provideRouter(routes, withInMemoryScrolling({
      scrollPositionRestoration: 'disabled', // DESHABILITADO - Nuestro servicio maneja el scroll
      anchorScrolling: 'disabled'            // DESHABILITADO - Nuestro servicio maneja los anclas
    })),
    
    provideAnimations(),
    provideHttpClient(),
    ScrollService, 
    MenuStateService
  ]
};