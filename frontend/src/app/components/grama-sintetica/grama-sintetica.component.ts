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
import { NavbarVisibilityService } from '../../services/navbar-visibility.service';

export interface GrassStageInfo {
  index: number;
  id: string;
  label: string;
  title: string;
  progressTarget: number;
}

@Component({
  selector: 'app-grama-sintetica',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grama-sintetica.component.html',
  styleUrls: ['./grama-sintetica.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GramaSinteticaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollTrack', { static: true }) scrollTrack!: ElementRef<HTMLElement>;

  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private navbarVisibilityService = inject(NavbarVisibilityService);

  // Slug oficial del producto Grama Sintética en el catálogo
  public readonly productSlug: string = '66-grama-sintetica';

  // Progreso de transición cinemática (0.0 a 1.0)
  public progress: number = 0;
  public activeStage: number = 0;

  public stages: GrassStageInfo[] = [
    { index: 0, id: 'panoramica', label: 'Panorámica', title: 'Vista General', progressTarget: 0.0 },
    { index: 1, id: 'mascotas', label: 'Pet-Friendly', title: 'Juego & Confort', progressTarget: 0.25 },
    { index: 2, id: 'macro', label: 'Detalle Macro', title: 'Fibras & Drenaje', progressTarget: 0.50 },
    { index: 3, id: 'rollo', label: 'Rollo', title: 'Suministro Directo', progressTarget: 0.75 },
    { index: 4, id: 'catalogo', label: 'Catálogo', title: 'Ficha del Producto', progressTarget: 1.0 }
  ];

  // Variables calculadas de capas para interpolación cinematográfica suave
  public heroOpacity: number = 1;
  public heroScale: number = 1;

  public playOpacity: number = 0;
  public playScale: number = 1.06;
  public playTranslateX: number = 25;

  public macroOpacity: number = 0;
  public macroScale: number = 1.22;
  public macroBlur: number = 8;

  public rollOpacity: number = 0;
  public rollScale: number = 1.1;

  public frontOpacity: number = 0;
  public frontScale: number = 1.0;

  public configTranslateY: number = 35;
  public configOpacity: number = 0;

  // Física de suavizado (Lerp calibrado a 0.12)
  private targetProgress: number = 0;
  private smoothProgress: number = 0;
  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;
  private lastHiddenState: boolean = false;

  private boundScroll = () => this.onNativeScroll();
  private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.addEventListener('scroll', this.boundScroll, { passive: true });
    window.addEventListener('resize', this.boundScroll, { passive: true });
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });

    this.onNativeScroll();
    this.startRenderEngine();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.navbarVisibilityService.registerHidden('grama-sintetica', false);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.removeEventListener('scroll', this.boundScroll);
    window.removeEventListener('resize', this.boundScroll);
    window.removeEventListener('keydown', this.boundKeyDown);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private onNativeScroll(): void {
    const el = this.scrollTrack?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const maxScroll = el.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrolled = -rect.top;
    const raw = scrolled / maxScroll;
    this.targetProgress = Math.max(0, Math.min(1, raw));

    const isAtLevel = rect.top <= 60 && rect.bottom >= 120;
    if (isAtLevel !== this.lastHiddenState) {
      this.lastHiddenState = isAtLevel;
      this.navbarVisibilityService.registerHidden('grama-sintetica', isAtLevel);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    const el = this.scrollTrack?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top <= 100 && rect.bottom >= window.innerHeight - 100) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        if (this.activeStage < 4) {
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

        this.onNativeScroll();

        const diff = this.targetProgress - this.smoothProgress;
        if (Math.abs(diff) > 0.00008) {
          this.smoothProgress += diff * 0.12;
        } else {
          this.smoothProgress = this.targetProgress;
        }

        this.calculateInterpolations(this.smoothProgress);
        this.cdr.detectChanges();

        this.animationFrameId = requestAnimationFrame(render);
      };

      this.animationFrameId = requestAnimationFrame(render);
    });
  }

  private calculateInterpolations(p: number): void {
    this.progress = p;

    if (p < 0.20) {
      this.activeStage = 0;
    } else if (p < 0.42) {
      this.activeStage = 1;
    } else if (p < 0.64) {
      this.activeStage = 2;
    } else if (p < 0.82) {
      this.activeStage = 3;
    } else {
      this.activeStage = 4;
    }

    // 1. Capa Panorámica (0.0 -> 0.30)
    if (p <= 0.18) {
      this.heroOpacity = 1;
      this.heroScale = 1 + p * 0.45;
    } else if (p < 0.30) {
      const t = (p - 0.18) / 0.12;
      this.heroOpacity = Math.max(0, 1 - t);
      this.heroScale = 1.08 + t * 0.08;
    } else {
      this.heroOpacity = 0;
    }

    // 2. Capa Plano Medio Husky Jugando (0.16 -> 0.50)
    if (p < 0.16) {
      this.playOpacity = 0;
      this.playScale = 1.06;
      this.playTranslateX = 24;
    } else if (p <= 0.28) {
      const t = (p - 0.16) / 0.12;
      this.playOpacity = t;
      this.playScale = 1.06 - t * 0.04;
      this.playTranslateX = 24 * (1 - t);
    } else if (p <= 0.40) {
      this.playOpacity = 1;
      const t = (p - 0.28) / 0.12;
      this.playScale = 1.02 + t * 0.05;
      this.playTranslateX = -t * 10;
    } else if (p < 0.50) {
      const t = (p - 0.40) / 0.10;
      this.playOpacity = Math.max(0, 1 - t);
      this.playScale = 1.07 + t * 0.05;
      this.playTranslateX = -10 - t * 10;
    } else {
      this.playOpacity = 0;
    }

    // 3. Capa Macro 8K Fibras y Drenaje (0.38 -> 0.70)
    if (p < 0.38) {
      this.macroOpacity = 0;
      this.macroScale = 1.22;
      this.macroBlur = 8;
    } else if (p <= 0.48) {
      const t = (p - 0.38) / 0.10;
      this.macroOpacity = t;
      this.macroScale = 1.22 - t * 0.14;
      this.macroBlur = 8 * (1 - t);
    } else if (p <= 0.62) {
      this.macroOpacity = 1;
      const t = (p - 0.48) / 0.14;
      this.macroScale = 1.08 - t * 0.05;
      this.macroBlur = 0;
    } else if (p < 0.70) {
      const t = (p - 0.62) / 0.08;
      this.macroOpacity = Math.max(0, 1 - t);
      this.macroScale = 1.03 - t * 0.03;
      this.macroBlur = t * 6;
    } else {
      this.macroOpacity = 0;
    }

    // 4. Capa Rollo Estudio Blanco (0.58 -> 0.88)
    if (p < 0.58) {
      this.rollOpacity = 0;
      this.rollScale = 1.1;
    } else if (p <= 0.68) {
      const t = (p - 0.58) / 0.10;
      this.rollOpacity = t;
      this.rollScale = 1.1 - t * 0.06;
    } else if (p <= 0.80) {
      this.rollOpacity = 1;
      const t = (p - 0.68) / 0.12;
      this.rollScale = 1.04 + t * 0.03;
    } else if (p < 0.88) {
      const t = (p - 0.80) / 0.08;
      this.rollOpacity = Math.max(0, 1 - t);
      this.rollScale = 1.07 + t * 0.04;
    } else {
      this.rollOpacity = 0;
    }

    // 5. Ficha Final Catálogo (0.78 -> 1.0)
    if (p < 0.78) {
      this.frontOpacity = 0;
      this.frontScale = 1.05;
      this.configOpacity = 0;
      this.configTranslateY = 35;
    } else if (p <= 0.88) {
      const t = (p - 0.78) / 0.10;
      this.frontOpacity = t;
      this.frontScale = 1.05 - t * 0.05;
      this.configOpacity = t;
      this.configTranslateY = 35 * (1 - t);
    } else {
      this.frontOpacity = 1;
      this.frontScale = 1.0;
      this.configOpacity = 1;
      this.configTranslateY = 0;
    }
  }

  public goToStage(stageIndex: number): void {
    const el = this.scrollTrack?.nativeElement;
    if (!el) return;

    const targets = [0.0, 0.28, 0.52, 0.74, 1.0];
    const target = targets[stageIndex] ?? 0;
    const maxScroll = el.offsetHeight - window.innerHeight;

    const trackTop = window.scrollY + el.getBoundingClientRect().top;
    const targetScrollY = trackTop + (target * maxScroll);

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  }

  public nextStage(): void {
    if (this.activeStage < 4) {
      this.goToStage(this.activeStage + 1);
    }
  }

  public prevStage(): void {
    if (this.activeStage > 0) {
      this.goToStage(this.activeStage - 1);
    }
  }
}
