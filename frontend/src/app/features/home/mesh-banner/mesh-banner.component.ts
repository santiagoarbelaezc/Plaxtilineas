import { Component, ElementRef, inject, PLATFORM_ID, AfterViewInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface Aliado {
  nombre: string;
  logo: string;
  scale?: number;
}

@Component({
  selector: 'app-mesh-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mesh-banner.component.html',
  styleUrls: ['./mesh-banner.component.css']
})
export class MeshBannerComponent implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private observer?: IntersectionObserver;

  isVisible = false;

  aliados: Aliado[] = [
    { nombre: 'Plastextil', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/logo-plastextil_ibgjci.png', scale: 0.9 },
    { nombre: 'Espumas Santafé', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878740/espumas_santafe_k82s21.png', scale: 1.05 },
    { nombre: 'Espumas Medellín', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/espumas_medellin_dd3gcm.png', scale: 1.3 },
    { nombre: 'Testicol', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878742/Testicol_do2hm1.png', scale: 1.85 },
    { nombre: 'Polylon', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/POLYLON_ahvqpe.png', scale: 1.8 },
    { nombre: 'Grupo Excala', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878742/grupoExcala_abrci9.png', scale: 1.0 },
    { nombre: 'Pegatex Artecola', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/logo-pegatex_ixgyw0.png', scale: 1.1 },
    { nombre: 'Preflex', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878742/preflex_vjabto.png', scale: 1.25 }
  ];

  ngAfterViewInit(): void {
    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
      this.isVisible = true;
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.ngZone.run(() => {
          this.isVisible = entry.isIntersecting;
          this.cdr.markForCheck();
        });
      },
      {
        root: null,
        threshold: 0.05
      }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
