import {
  Component,
  ChangeDetectionStrategy,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface StoryStage {
  index: number;
  id: string;
  tabLabel: string;
  kicker: string;
  titleLead: string;
  titleHighlight: string;
  description: string;
  image: string;
  isEmblem?: boolean;
  sectors?: string[];
}

export interface StageLayerState {
  opacity: number;
  scale: number;
  blur: number;
}

@Component({
  selector: 'app-values',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './values.component.html',
  styleUrls: ['./values.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Values implements AfterViewInit, OnDestroy {
  @ViewChild('scrollTrack', { static: true }) scrollTrack!: ElementRef<HTMLElement>;

  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);

  public activeStage = 0;
  public progress = 0;
  public layerStates: StageLayerState[] = [];

  public stages: StoryStage[] = [
    {
      index: 0,
      id: 'origen',
      tabLabel: 'Origen',
      kicker: 'ORIGEN & ESENCIA FAMILIAR · ARMENIA, QUINDÍO',
      titleLead: 'NACIMOS EN ARMENIA',
      titleHighlight: 'Unión y fortaleza de tres hermanos',
      description:
        'Plaxtilineas nació en Armenia, Quindío, como una empresa de origen y esencia familiar. Su isotipo triangular simboliza precisamente la unión y fortaleza de los tres hermanos fundadores.',
      image: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1795130400/logo-solo_r6tfo7.png',
      isEmblem: true
    },
    {
      index: 1,
      id: 'sectores',
      tabLabel: 'Sectores',
      kicker: 'ACTIVIDAD & SECTORES PRODUCTIVOS',
      titleLead: 'DISTRIBUCIÓN DE INSUMOS',
      titleHighlight: 'Impulsando cinco sectores clave',
      description:
        'Desde sus comienzos se ha dedicado a la distribución de insumos para sectores como la marroquinería, tapicería, construcción, hogar y agricultura.',
      image: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1795183242/Perforated_Leather_Roll_and_Luxury_Car_Seat_updwbt.png',
      sectors: ['Marroquinería', 'Tapicería', 'Construcción', 'Hogar', 'Agricultura']
    },
    {
      index: 2,
      id: 'pilares',
      tabLabel: 'Pilares',
      kicker: 'PILARES DE NUESTRA TRAYECTORIA',
      titleLead: 'CONOCIMIENTO & CERCANÍA',
      titleHighlight: 'Relaciones de confianza a largo plazo',
      description:
        'La empresa se ha distinguido por el trabajo constante, el conocimiento profundo de los productos que comercializa y una atención cercana, cálida y personalizada.',
      image: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1795183242/Hydroponic_Lettuce_Greenhouse_Aisle_l615hz.png'
    },
    {
      index: 3,
      id: 'presente',
      tabLabel: 'Presente',
      kicker: 'EVOLUCIÓN & PRESENTE',
      titleLead: 'TRADICIÓN & FUTURO',
      titleHighlight: 'Profesionalización e innovación continua',
      description:
        'Actualmente combina su tradición familiar con un proceso de profesionalización, buscando innovar, optimizar sus procesos internos y proyectarse como referente en el mercado regional.',
      image: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1795183243/Concrete_Construction_Site_Under_Blue_Skies_xslepx.png'
    }
  ];

  private targetProgress = 0;
  private smoothProgress = 0;
  private animationFrameId: number | null = null;
  private isDestroyed = false;
  private isDesktopSticky = true;
  private prefersReducedMotion = false;

  private boundScroll = () => this.onNativeScroll();
  private boundResize = () => this.onResize();
  private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

  constructor() {
    this.layerStates = this.stages.map((_, idx) => ({
      opacity: idx === 0 ? 1 : 0,
      scale: idx === 0 ? 1 : 1.06,
      blur: idx === 0 ? 0 : 4
    }));
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    this.isDesktopSticky = window.innerWidth > 900 && !this.prefersReducedMotion;

    window.addEventListener('scroll', this.boundScroll, { passive: true });
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });

    this.onNativeScroll();
    this.startRenderEngine();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;

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
    this.isDesktopSticky = window.innerWidth > 900 && !this.prefersReducedMotion;
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
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.isDesktopSticky) return;
    const el = this.scrollTrack?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top <= 100 && rect.bottom >= window.innerHeight - 100) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        if (this.activeStage < this.stages.length - 1) {
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
    const count = this.stages.length;
    const scaled = p * (count - 1);
    this.activeStage = Math.max(0, Math.min(count - 1, Math.round(scaled)));

    for (let i = 0; i < count; i++) {
      const dist = Math.abs(scaled - i);
      const opacity = Math.max(0, 1 - dist);
      const scale = 1.0 + dist * 0.06;
      const blur = dist > 0.05 ? Math.min(4.5, dist * 4) : 0;

      this.layerStates[i] = {
        opacity,
        scale,
        blur
      };
    }
  }

  public goToStage(stageIndex: number): void {
    const clamped = Math.max(0, Math.min(this.stages.length - 1, stageIndex));
    const targetRatio = clamped / (this.stages.length - 1);

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
    if (this.activeStage < this.stages.length - 1) {
      this.goToStage(this.activeStage + 1);
    }
  }

  public prevStage(): void {
    if (this.activeStage > 0) {
      this.goToStage(this.activeStage - 1);
    }
  }
}
