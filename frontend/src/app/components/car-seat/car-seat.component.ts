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
import { RouterModule, Router } from '@angular/router';

export interface ProductReference {
  id: number;
  code: string;
  name: string;
  shortLabel: string;
  price: number;
  colorKey: 'negro' | 'gris' | 'charcoat';
  colorHex: string;
  filterStyle: string;
}

export interface StageInfo {
  index: number;
  id: string;
  label: string;
  title: string;
  progressTarget: number;
}

@Component({
  selector: 'app-car-seat',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './car-seat.component.html',
  styleUrls: ['./car-seat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarSeatComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLElement>;

  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // ID oficial del producto Continental Plus Cyrus en el catálogo externo
  public readonly productId: number = 188;

  // Progreso de transición cinemática (0.0 a 1.0)
  public progress: number = 0;
  public activeStage: number = 0;

  // Etapas del recorrido cinemático estilo Apple
  public stages: StageInfo[] = [
    { index: 0, id: 'asiento', label: 'Asiento', title: 'Diseño Hero', progressTarget: 0.0 },
    { index: 1, id: 'angulo', label: 'Perspectiva', title: 'Ángulo 45°', progressTarget: 0.25 },
    { index: 2, id: 'macro', label: 'Microperforado', title: 'Detalle Pinhole 8K', progressTarget: 0.50 },
    { index: 3, id: 'rollo', label: 'Bobina', title: 'Suministro 1.50m', progressTarget: 0.75 },
    { index: 4, id: 'cotizar', label: 'Cotizar', title: 'Ficha & Pedido', progressTarget: 1.0 }
  ];

  // Referencias oficiales de CONTINENTAL PLUS CYRUS
  public references: ProductReference[] = [
    {
      id: 1,
      code: '800 NEGRO TN A',
      name: 'CONTINENTAL PLUS CYRUS - 800 NEGRO TN A',
      shortLabel: '800 Negro TN A',
      price: 29900,
      colorKey: 'negro',
      colorHex: '#141518',
      filterStyle: 'none'
    },
    {
      id: 2,
      code: '1210 GRIS A',
      name: 'CONTINENTAL PLUS CYRUS - 1210 GRIS A',
      shortLabel: '1210 Gris A',
      price: 29900,
      colorKey: 'gris',
      colorHex: '#9ca3af',
      filterStyle: 'brightness(1.55) contrast(0.92) saturate(0.2)'
    },
    {
      id: 3,
      code: '1131 CHARCOAT A',
      name: 'CONTINENTAL PLUS CYRUS - 1131 CHARCOAT A',
      shortLabel: '1131 Charcoat A',
      price: 29900,
      colorKey: 'charcoat',
      colorHex: '#374151',
      filterStyle: 'brightness(1.22) contrast(0.96) saturate(0.3)'
    }
  ];

  public selectedReference: ProductReference = this.references[0];
  public quantity: number = 1;

  // Variables calculadas de capas para interpolación cinematográfica suave
  public heroOpacity: number = 1;
  public heroScale: number = 1;

  public angleOpacity: number = 0;
  public angleScale: number = 1.05;
  public angleTranslateX: number = 0;

  public macroOpacity: number = 0;
  public macroScale: number = 1.15;
  public macroBlur: number = 0;

  public rollOpacity: number = 0;
  public rollScale: number = 1.08;

  public frontOpacity: number = 0;
  public frontScale: number = 1.0;

  public configTranslateY: number = 30;
  public configOpacity: number = 0;

  // Física de suavizado (Lerp calibrado a 0.09 para máxima elegancia y menor sensibilidad)
  private targetProgress: number = 0;
  private smoothProgress: number = 0;
  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;

  private boundScroll = () => this.onNativeScroll();
  private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const container = this.scrollContainer.nativeElement;
    if (container) {
      container.addEventListener('scroll', this.boundScroll, { passive: true });
    }
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });

    // Iniciamos el motor cinemático
    this.startRenderEngine();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const container = this.scrollContainer?.nativeElement;
    if (container) {
      container.removeEventListener('scroll', this.boundScroll);
    }
    window.removeEventListener('keydown', this.boundKeyDown);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ── Listener de Scroll Nativo: Suave y Equilibrado ──
  private onNativeScroll(): void {
    const el = this.scrollContainer.nativeElement;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    const raw = el.scrollTop / maxScroll;
    this.targetProgress = Math.max(0, Math.min(1, raw));
  }

  private onKeyDown(e: KeyboardEvent): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      const nextStage = Math.min(4, this.activeStage + 1);
      this.goToStage(nextStage);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      const prevStage = Math.max(0, this.activeStage - 1);
      this.goToStage(prevStage);
    }
  }

  // ── Render Engine cinemático a 60 FPS con aceleración por GPU ──
  private startRenderEngine(): void {
    this.ngZone.runOutsideAngular(() => {
      const render = () => {
        if (this.isDestroyed) return;

        // Suavizado lerp calibrado para estabilidad (0.09)
        const diff = this.targetProgress - this.smoothProgress;
        if (Math.abs(diff) > 0.00008) {
          this.smoothProgress += diff * 0.09;
        } else {
          this.smoothProgress = this.targetProgress;
        }

        this.calculateInterpolations(this.smoothProgress);

        // Forzamos actualización visual inmediata sin saltos
        this.cdr.detectChanges();

        this.animationFrameId = requestAnimationFrame(render);
      };

      this.animationFrameId = requestAnimationFrame(render);
    });
  }

  // ── Cálculo de Transformaciones con Amplio Espacio en las Etapas Finales ──
  private calculateInterpolations(p: number): void {
    this.progress = p;

    // Distribución equilibrada de etapas para evitar sensibilidad apresurada al final
    if (p < 0.20) {
      this.activeStage = 0; // Hero
    } else if (p < 0.42) {
      this.activeStage = 1; // Ángulo 45°
    } else if (p < 0.64) {
      this.activeStage = 2; // Macro Microperforado
    } else if (p < 0.82) {
      this.activeStage = 3; // Bobina 1.50m
    } else {
      this.activeStage = 4; // Ficha Final & Cotizador (20% completo de recorrido holgado)
    }

    // 1. Capa Hero (0.0 -> 0.26)
    if (p <= 0.18) {
      this.heroOpacity = 1;
      this.heroScale = 1 + p * 0.5;
    } else if (p < 0.30) {
      const t = (p - 0.18) / 0.12;
      this.heroOpacity = Math.max(0, 1 - t);
      this.heroScale = 1.09 + t * 0.08;
    } else {
      this.heroOpacity = 0;
    }

    // 2. Capa Ángulo 45° (0.16 -> 0.48)
    if (p < 0.16) {
      this.angleOpacity = 0;
      this.angleScale = 1.06;
      this.angleTranslateX = 25;
    } else if (p <= 0.28) {
      const t = (p - 0.16) / 0.12;
      this.angleOpacity = t;
      this.angleScale = 1.06 - t * 0.04;
      this.angleTranslateX = 25 * (1 - t);
    } else if (p <= 0.40) {
      this.angleOpacity = 1;
      const t = (p - 0.28) / 0.12;
      this.angleScale = 1.02 + t * 0.05;
      this.angleTranslateX = -t * 12;
    } else if (p < 0.50) {
      const t = (p - 0.40) / 0.10;
      this.angleOpacity = Math.max(0, 1 - t);
      this.angleScale = 1.07 + t * 0.06;
      this.angleTranslateX = -12 - t * 12;
    } else {
      this.angleOpacity = 0;
    }

    // 3. Capa Macro Microperforado 8K (0.38 -> 0.70)
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

    // 4. Capa Bobina Continental Plus Cyrus (0.58 -> 0.86)
    if (p < 0.58) {
      this.rollOpacity = 0;
      this.rollScale = 1.10;
    } else if (p <= 0.68) {
      const t = (p - 0.58) / 0.10;
      this.rollOpacity = t;
      this.rollScale = 1.10 - t * 0.06;
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

    // 5. Capa Frontal & Cotizador Final (0.78 -> 1.0)
    // Amplio margen para que el usuario no sienta que el scroll se le escapa
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

  // ── Navegación Directa por Etapas ──
  public goToStage(stageIndex: number): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;

    const targets = [0.0, 0.28, 0.52, 0.74, 1.0];
    const target = targets[stageIndex] ?? 0;
    const maxScroll = el.scrollHeight - el.clientHeight;

    el.scrollTo({
      top: target * maxScroll,
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

  // ── Métodos de Pedido & Cotización ──
  public selectReference(ref: ProductReference): void {
    this.selectedReference = ref;
    this.cdr.markForCheck();
  }

  public incrementQuantity(): void {
    this.quantity++;
    this.cdr.markForCheck();
  }

  public decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
      this.cdr.markForCheck();
    }
  }

  public get unitPrice(): number {
    return this.selectedReference.price;
  }

  public get totalEstimated(): number {
    return this.unitPrice * this.quantity;
  }

  public formatCop(amount: number): string {
    return '$ ' + amount.toLocaleString('es-CO');
  }

  public get whatsappUrl(): string {
    const text = encodeURIComponent(
      `Hola Plaxtilineas, me interesa cotizar ${this.quantity} metro(s) de CONTINENTAL PLUS CYRUS (${this.selectedReference.shortLabel}) ` +
      `(Total estimado: ${this.formatCop(this.totalEstimated)} COP). ¿Tienen disponibilidad de entrega inmediata?`
    );
    return `https://wa.me/573100000000?text=${text}`;
  }

  public goToProductDescription(): void {
    this.router.navigate(['/producto', this.productId]);
  }
}
