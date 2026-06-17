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

  private initPwaLogic() {
    // Detect iOS and Safari (since Chrome on iOS is basically Safari but users still need to add via share button)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    
    // Check if it's already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone === true);
    
    const dismissed = localStorage.getItem('ios_pwa_dismissed') === 'true';
    if (isIos && !isStandalone && !dismissed) {
      this.isIosSubject.next(true);
    }

    // Android / Chrome: Capture the install prompt event
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent Chrome from automatically showing the prompt
      event.preventDefault();
      // Save the event so it can be triggered later.
      this.promptEvent = event;
      // Notify the app that installation is possible
      this.canInstallSubject.next(true);
    });
    
    window.addEventListener('appinstalled', (event) => {
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
    // Wait for the user to respond to the prompt
    const { outcome } = await this.promptEvent.userChoice;
    console.log(`El usuario ha decidido: ${outcome}`);
    // We can't use the prompt again, clear it up
    this.promptEvent = null;
    this.canInstallSubject.next(false);
    
    return outcome === 'accepted';
  }

  public dismissIosPrompt() {
    localStorage.setItem('ios_pwa_dismissed', 'true');
    this.isIosSubject.next(false);
  }
}
