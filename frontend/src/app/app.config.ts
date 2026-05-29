import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { routes } from './app.routes';
import { ScrollService } from './services/scroll.service';
import { MenuStateService } from './services/menu-state.service';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
   
    // ⭐⭐ IMPORTANTE: Deshabilitar el scroll de Angular ⭐⭐
    provideRouter(routes, withInMemoryScrolling({
      scrollPositionRestoration: 'disabled', // DESHABILITADO - Nuestro servicio maneja el scroll
      anchorScrolling: 'disabled'            // DESHABILITADO - Nuestro servicio maneja los anclas
    })),
    
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    ScrollService, 
    MenuStateService, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};