import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  private isBrowser: boolean;
  private initialViewportHeight: number = 0;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initKeyboardListener();
    }
  }

  private initKeyboardListener(): void {
    if (!window.visualViewport) return;

    this.initialViewportHeight = window.visualViewport.height;

    const handleResize = () => {
      if (!window.visualViewport) return;
      const currentHeight = window.visualViewport.height;
      const heightThreshold = this.initialViewportHeight * 0.78;

      // Si el viewport visible se reduce más del 22%, el teclado virtual está desplegado
      if (currentHeight < heightThreshold) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
        this.initialViewportHeight = currentHeight;
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
  }
}
