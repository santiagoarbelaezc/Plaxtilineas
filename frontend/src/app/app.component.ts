import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ScrollService } from './services/scroll.service';
import { SeoService } from './services/seo.service';
import { CartDrawerComponent } from './cart/cart-drawer/cart-drawer.component';
import { MobileCartComponent } from './cart/mobile-cart/mobile-cart.component';
import { PwaService } from './services/pwa.service';
import { LoadingScreenComponent } from './shared/ui/loading-screen/loading-screen';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
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
export class AppComponent implements OnInit, OnDestroy {
  title = 'Plaxtilineas';
  isLoading = true;

  canInstall$: Observable<boolean>;
  isIos$: Observable<boolean>;

  activeStep = 1;

  private subscriptions = new Subscription();
  private swCheckInterval: ReturnType<typeof setInterval> | null = null;
  private isBrowser: boolean;
  private boundVisibilityChange = () => this.onVisibilityChange();

  constructor(
    private scrollService: ScrollService,
    private router: Router,
    private seoService: SeoService,
    private pwaService: PwaService,
    private keyboardService: KeyboardService,
    public authService: AuthService,
    public cartService: CartService,
    public themeService: ThemeService,
    @Inject(PLATFORM_ID) platformId: Object,
    @Optional() private swUpdate: SwUpdate | null
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.canInstall$ = this.pwaService.canInstall$;
    this.isIos$ = this.pwaService.isIos$;
  }

  ngOnInit(): void {
    this.seoService.setDefaultSeo();

    setTimeout(() => {
      this.isLoading = false;
    }, 300);

    this.setupRouteChangeScroll();
    this.setupServiceWorkerUpdates();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.swCheckInterval) {
      clearInterval(this.swCheckInterval);
      this.swCheckInterval = null;
    }
    if (this.isBrowser) {
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    }
  }

  /**
   * Mantiene la app siempre sincronizada con el último deploy.
   * Evita que el Service Worker deje atrapados a los usuarios en versiones viejas.
   */
  private setupServiceWorkerUpdates(): void {
    if (!this.isBrowser || !this.swUpdate || !this.swUpdate.isEnabled) {
      return;
    }

    // 1. Cuando haya una nueva versión lista, activarla y recargar automáticamente (una sola vez por versión)
    const versionSub = this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(async (evt) => {
        const latestHash = evt.latestVersion.hash;
        const alreadyReloaded = sessionStorage.getItem('plx_sw_reloaded_hash');
        if (alreadyReloaded === latestHash) {
          return;
        }
        try {
          sessionStorage.setItem('plx_sw_reloaded_hash', latestHash);
          await this.swUpdate?.activateUpdate();
        } finally {
          window.location.reload();
        }
      });
    this.subscriptions.add(versionSub);

    // 2. Si el caché del SW queda corrupto o desincronizado tras un deploy, limpiar y recargar
    const unrecSub = this.swUpdate.unrecoverable.subscribe(async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } finally {
        window.location.reload();
      }
    });
    this.subscriptions.add(unrecSub);

    // 3. Buscar actualizaciones al cargar, al volver a la pestaña y cada 5 minutos
    this.checkSwUpdate();
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    this.swCheckInterval = setInterval(() => this.checkSwUpdate(), 5 * 60 * 1000);
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.checkSwUpdate();
    }
  }

  private checkSwUpdate(): void {
    this.swUpdate?.checkForUpdate().catch(() => {
      // Silencioso si el usuario está offline
    });
  }

  private setupRouteChangeScroll(): void {
    const navSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        // Permite verificar actualizaciones ligeras al navegar
      });
    this.subscriptions.add(navSub);
  }

  formatearPrecioModal(precio: number | undefined): string {
    if (!precio) return '$ 0';
    const entero = Math.round(Number(precio));
    return '$ ' + entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
