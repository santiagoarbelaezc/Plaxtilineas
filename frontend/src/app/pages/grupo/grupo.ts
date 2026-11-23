import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';

export interface GrupoBrand {
  id: string;
  name: string;
  tag: string;
  heroImage: string;
  logo: string;
  description: string;
  websiteUrl: string;
}

export interface BrandLayerState {
  opacity: number;
  scale: number;
  blur: number;
}

@Component({
  selector: 'app-grupo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    Footer,
    SocialButtonsComponent
  ],
  templateUrl: './grupo.html',
  styleUrls: ['./grupo.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Grupo implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollTrack', { static: true }) scrollTrack!: ElementRef<HTMLElement>;

  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);

  public activeStage = 0;
  public progress = 0;
  public layerStates: BrandLayerState[] = [];

  public readonly brands: GrupoBrand[] = [
    {
      id: 'camascotas',
      name: 'Camascotas',
      tag: 'LÍNEA PET CARE & DESCANSO ANIMAL',
      heroImage: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1786973369/proyecto-camascotas_qcmstp.png',
      logo: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796946/logo2_hrboyb.png',
      description:
        'Camas ortopédicas, colchonetas impermeables y accesorios diseñados con amor para el descanso y salud de tus mascotas.',
      websiteUrl: 'https://camascotas.com/'
    },
    {
      id: 'districol',
      name: 'Colchones Districol',
      tag: 'CONFORT & DESCANSO ORTOPÉDICO',
      heroImage: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796364/Districol_Mattress_Brand_Hero_Scene_z6577x.png',
      logo: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796538/logo-distri_ri8lkq.png',
      description:
        'Línea de descanso ortopédico y anatómico diseñada con espumas de alta resiliencia para una postura óptima y bienestar.',
      websiteUrl: 'https://colchonesdistricol.com/'
    },
    {
      id: 'espumas',
      name: 'Espumas y Plásticos',
      tag: 'MATERIA PRIMA & CORTE INDUSTRIAL',
      heroImage: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796374/Espumas_y_Pl%C3%A1sticos__Confort_Moderno_pu3seo.png',
      logo: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792788733/logo-grande_qauprn.png',
      description:
        'Transformación, corte exacto y distribución de espumas industriales en densidades D20 a D30, plásticos técnicos y bobinas.',
      websiteUrl: 'https://espumasyplasticos.com/'
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
    this.layerStates = this.brands.map((_, idx) => ({
      opacity: idx === 0 ? 1 : 0,
      scale: idx === 0 ? 1 : 1.06,
      blur: idx === 0 ? 0 : 4
    }));
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      window.scrollTo(0, 0);
    }
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
        if (this.activeStage < this.brands.length - 1) {
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
    const count = this.brands.length;
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
    const clamped = Math.max(0, Math.min(this.brands.length - 1, stageIndex));
    const targetRatio = clamped / (this.brands.length - 1);

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
    if (this.activeStage < this.brands.length - 1) {
      this.goToStage(this.activeStage + 1);
    }
  }

  public prevStage(): void {
    if (this.activeStage > 0) {
      this.goToStage(this.activeStage - 1);
    }
  }
}
