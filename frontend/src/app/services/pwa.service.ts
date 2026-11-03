import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: any = null;
  
  private canInstallSubject = new BehaviorSubject<boolean>(false);
  canInstall$ = this.canInstallSubject.asObservable();

  private isIosSubject = new BehaviorSubject<boolean>(false);
  isIos$ = this.isIosSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initPwaLogic();
    }
  }

  private isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;
    const isMobileUA = mobileRegex.test(userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileUA || isSmallScreen;
  }

  private initPwaLogic() {
    // Si no es un dispositivo móvil, no activamos los avisos de instalación en pantalla
    if (!this.isMobileDevice()) {
      return;
    }

    // Detect iOS and Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    
    // Check if it's already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone === true);
    
    const dismissed = localStorage.getItem('ios_pwa_dismissed') === 'true';
    if (isIos && !isStandalone && !dismissed) {
      this.isIosSubject.next(true);
    }

    // Android / Mobile Chrome: Capture the install prompt event
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent browser default prompt
      event.preventDefault();
      // Save event
      this.promptEvent = event;
      
      // Solo notificar si sigue siendo un dispositivo móvil
      if (this.isMobileDevice()) {
        this.canInstallSubject.next(true);
      }
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('Aplicación instalada exitosamente');
      this.canInstallSubject.next(false);
      this.isIosSubject.next(false);
      this.promptEvent = null;
    });
  }

  public async installPwa(): Promise<boolean> {
    if (!this.promptEvent) {
      return false;
    }
    // Show the native prompt
    this.promptEvent.prompt();
    // Wait for the user to respond
    const { outcome } = await this.promptEvent.userChoice;
    console.log(`El usuario ha decidido: ${outcome}`);
    this.promptEvent = null;
    this.canInstallSubject.next(false);
    
    return outcome === 'accepted';
  }

  public dismissIosPrompt() {
    localStorage.setItem('ios_pwa_dismissed', 'true');
    this.isIosSubject.next(false);
  }
}
