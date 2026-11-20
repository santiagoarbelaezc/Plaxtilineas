import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuStateService } from '../../../services/menu-state.service';
import { NavbarVisibilityService } from '../../../services/navbar-visibility.service';

export interface EjeEspecialidad {
  id: string;
  nombre: string;
  shortLabel: string;
  imagen: string;
}

export interface LayerVisualState {
  opacity: number;
  scale: number;
  blur: number;
}

@Component({
  selector: 'app-nosotros-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nosotros-inicio.component.html',
  styleUrls: ['./nosotros-inicio.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NosotrosInicioComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollTrack', { static: true }) scrollTrack!: ElementRef<HTMLElement>;

  private menuStateService = inject(MenuStateService);
  private navbarVisibilityService = inject(NavbarVisibilityService);
  private platformId = inject(PLATFORM_ID);
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private observer?: IntersectionObserver;

  isVisible = false;
  private hasStarted = false;
  private isDestroyed = false;

  // Frases dinámicas con efecto máquina de escribir
  phrases: string[] = [
    'todas las industrias',
    'obras de construcción',
    'el sector agrícola',
    'tapicería hogar y automotriz',
    'soluciones en espumas',
    'plásticos y empaque'
  ];
  currentPhraseIndex = 0;
  displayedText = '';
  isDeleting = false;
  private typewriterTimer: ReturnType<typeof setTimeout> | null = null;

  // 3 Líneas principales con imágenes oficiales en Cloudinary
  ejes: EjeEspecialidad[] = [
    {
      id: 'construccion',
      nombre: 'Construcción & Obra',
      shortLabel: 'Construcción',
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1795183243/Concrete_Construction_Site_Under_Blue_Skies_xslepx.png'
    },
    {
      id: 'agricultura',
      nombre: 'Agricultura & Tecnificación',
      shortLabel: 'Agricultura',
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1795183242/Hydroponic_Lettuce_Greenhouse_Aisle_l615hz.png'
    },
    {
      id: 'tapiceria',
      nombre: 'Tapicería Hogar & Automotriz',
      shortLabel: 'Tapicería',
      imagen: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1795183242/Perforated_Leather_Roll_and_Luxury_Car_Seat_updwbt.png'
    }
  ];

  // Estado cinemático (0.0 a 1.0)
  activeStage = 0;
  progress = 0;
  layerStates: LayerVisualState[] = [];

  private targetProgress = 0;
  private smoothProgress = 0;
  private animationFrameId: number | null = null;
  private lastHiddenState = false;
  private isDesktopSticky = true;
  private prefersReducedMotion = false;

  private boundScroll = () => this.onNativeScroll();
  private boundResize = () => this.onResize();
  private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

  constructor() {
    this.layerStates = this.ejes.map((_, idx) => ({
      opacity: idx === 0 ? 1 : 0,
      scale: idx === 0 ? 1 : 1.06,
      blur: idx === 0 ? 0 : 4
    }));
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.displayedText = this.phrases[0];
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    this.isDesktopSticky = window.innerWidth > 960 && !this.prefersReducedMotion;

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          this.ngZone.run(() => {
            if (entry.isIntersecting) {
              this.isVisible = true;
              this.resumeTypewriter();
            } else {
              this.isVisible = false;
              this.pauseTypewriter();
            }
            this.cdr.markForCheck();
          });
        },
        { root: null, threshold: 0.08 }
      );
      this.observer.observe(this.elementRef.nativeElement);
    } else {
      this.isVisible = true;
      this.startTypewriter();
    }

    window.addEventListener('scroll', this.boundScroll, { passive: true });
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });

    this.onNativeScroll();
    this.startRenderEngine();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.pauseTypewriter();
    this.navbarVisibilityService.registerHidden('nosotros-inicio', false);

    if (this.observer) {
      this.observer.disconnect();
    }

    if (!this.isBrowser) return;

    window.removeEventListener('scroll', this.boundScroll);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('keydown', this.boundKeyDown);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private onResize(): void {
    this.isDesktopSticky = window.innerWidth > 960 && !this.prefersReducedMotion;
    if (!this.isDesktopSticky && this.lastHiddenState) {
      this.lastHiddenState = false;
      this.navbarVisibilityService.registerHidden('nosotros-inicio', false);
    }
    this.onNativeScroll();
  }

  private onNativeScroll(): void {
    if (!this.isDesktopSticky) return;

    const el = this.scrollTrack?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const maxScroll = el.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrolled = -rect.top;
    const raw = scrolled / maxScroll;
    this.targetProgress = Math.max(0, Math.min(1, raw));

    const isAtLevel = rect.top <= 60 && rect.bottom >= 140;
    if (isAtLevel !== this.lastHiddenState) {
      this.lastHiddenState = isAtLevel;
      this.navbarVisibilityService.registerHidden('nosotros-inicio', isAtLevel);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.isDesktopSticky) return;
    const el = this.scrollTrack?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top <= 100 && rect.bottom >= window.innerHeight - 100) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        if (this.activeStage < this.ejes.length - 1) {
          e.preventDefault();
          this.goToStage(this.activeStage + 1);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        if (this.activeStage > 0) {
          e.preventDefault();
          this.goToStage(this.activeStage - 1);
        }
      }
    }
  }

  private startRenderEngine(): void {
    this.ngZone.runOutsideAngular(() => {
      const render = () => {
        if (this.isDestroyed) return;

        if (this.isDesktopSticky) {
          this.onNativeScroll();
        }

        const diff = this.targetProgress - this.smoothProgress;
        if (Math.abs(diff) > 0.00015) {
          this.smoothProgress += diff * 0.12;
          this.calculateInterpolations(this.smoothProgress);
          this.cdr.detectChanges();
        } else if (this.smoothProgress !== this.targetProgress) {
          this.smoothProgress = this.targetProgress;
          this.calculateInterpolations(this.smoothProgress);
          this.cdr.detectChanges();
        }

        this.animationFrameId = requestAnimationFrame(render);
      };

      this.animationFrameId = requestAnimationFrame(render);
    });
  }

  private calculateInterpolations(p: number): void {
    this.progress = p;
    const count = this.ejes.length;
    const scaled = p * (count - 1);
    this.activeStage = Math.max(0, Math.min(count - 1, Math.round(scaled)));

    for (let i = 0; i < count; i++) {
      const dist = Math.abs(scaled - i);
      const opacity = Math.max(0, 1 - dist);
      const scale = 1.0 + dist * 0.06;
      const blur = dist > 0.05 ? Math.min(5, dist * 4.5) : 0;

      this.layerStates[i] = {
        opacity,
        scale,
        blur
      };
    }
  }

  public goToStage(stageIndex: number): void {
    const clamped = Math.max(0, Math.min(this.ejes.length - 1, stageIndex));
    const targetRatio = clamped / (this.ejes.length - 1);

    if (!this.isDesktopSticky) {
      this.targetProgress = targetRatio;
      this.activeStage = clamped;
      if (this.prefersReducedMotion) {
        this.smoothProgress = targetRatio;
        this.calculateInterpolations(targetRatio);
      }
      this.cdr.markForCheck();
      return;
    }

    const el = this.scrollTrack?.nativeElement;
    if (!el) return;

    const maxScroll = el.offsetHeight - window.innerHeight;
    const trackTop = window.scrollY + el.getBoundingClientRect().top;
    const targetScrollY = trackTop + targetRatio * maxScroll;

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  }

  public nextStage(): void {
    if (this.activeStage < this.ejes.length - 1) {
      this.goToStage(this.activeStage + 1);
    }
  }

  public prevStage(): void {
    if (this.activeStage > 0) {
      this.goToStage(this.activeStage - 1);
    }
  }

  // ── Efecto Typewriter ──
  private startTypewriter(): void {
    if (!this.isBrowser) {
      this.displayedText = this.phrases[0];
      return;
    }
    this.typeNextChar();
  }

  private pauseTypewriter(): void {
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private resumeTypewriter(): void {
    if (!this.isBrowser || this.typewriterTimer) return;

    const delay = !this.hasStarted ? 260 : 100;
    this.hasStarted = true;
    this.typewriterTimer = setTimeout(() => {
      this.typeNextChar();
    }, delay);
  }

  private typeNextChar(): void {
    if (!this.isVisible) return;

    const fullPhrase = this.phrases[this.currentPhraseIndex];

    if (this.isDeleting) {
      this.displayedText = fullPhrase.substring(0, this.displayedText.length - 1);
    } else {
      this.displayedText = fullPhrase.substring(0, this.displayedText.length + 1);
    }

    this.cdr.markForCheck();

    let speed = this.isDeleting ? 38 : 82;

    if (!this.isDeleting && this.displayedText === fullPhrase) {
      speed = 2100;
      this.isDeleting = true;
    } else if (this.isDeleting && this.displayedText === '') {
      this.isDeleting = false;
      this.currentPhraseIndex = (this.currentPhraseIndex + 1) % this.phrases.length;
      speed = 420;
    }

    this.typewriterTimer = setTimeout(() => this.typeNextChar(), speed);
  }

  limpiarFiltros(): void {
    this.menuStateService.clearLastSelectedSubcategory();
  }
}
