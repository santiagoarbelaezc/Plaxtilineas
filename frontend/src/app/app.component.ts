import { Component, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ScrollService } from './services/scroll.service';
import { SeoService } from './services/seo.service';
import { CommonModule } from '@angular/common';
import { CartDrawerComponent } from './cart/cart-drawer/cart-drawer.component';
import { MobileCartComponent } from './cart/mobile-cart/mobile-cart.component';
import { PwaService } from './services/pwa.service';
import { LoadingScreenComponent } from './shared/ui/loading-screen/loading-screen';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ToastNotificationComponent } from './shared/ui/toast-notification/toast-notification.component';
import { CookieConsentComponent } from './shared/ui/cookies/cookies';

import { KeyboardService } from './services/keyboard.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CartDrawerComponent,
    MobileCartComponent,
    LoadingScreenComponent,
    ToastNotificationComponent,
    CookieConsentComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Plaxtilineas';
  isLoading = true;
  
  canInstall$: Observable<boolean>;
  isIos$: Observable<boolean>;

  activeStep = 1;

  constructor(
    private scrollService: ScrollService,
    private router: Router,
    private seoService: SeoService,
    private pwaService: PwaService,
    private keyboardService: KeyboardService,
    public authService: AuthService,
    public themeService: ThemeService
  ) {
    this.canInstall$ = this.pwaService.canInstall$;
    this.isIos$ = this.pwaService.isIos$;
  }

  ngOnInit() {
    console.log('🚀 AppComponent inicializado');
    this.seoService.setDefaultSeo();

    // Ocultar pantalla de carga inicial
    setTimeout(() => {
      this.isLoading = false;
      console.log('✨ Carga completada');
    }, 300);
    
    this.setupRouteChangeScroll();
  }

  private setupRouteChangeScroll(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      console.log(`📍 Navegación completada: ${event.url}`);
    });
  }

  installPwa(): void {
    this.pwaService.installPwa();
  }

  nextStep(): void {
    if (this.activeStep < 3) {
      this.activeStep++;
    }
  }

  prevStep(): void {
    if (this.activeStep > 1) {
      this.activeStep--;
    }
  }

  dismissIosPrompt(): void {
    this.pwaService.dismissIosPrompt();
  }
}