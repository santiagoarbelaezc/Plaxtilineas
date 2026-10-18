import { Component, inject, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuStateService } from '../../services/menu-state.service';

export interface EjePrincipal {
  nombre: string;
  detalle: string;
  link: string;
  queryParams?: any;
}

@Component({
  selector: 'app-nosotros-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nosotros-inicio.component.html',
  styleUrls: ['./nosotros-inicio.component.css']
})
export class NosotrosInicioComponent implements OnInit, AfterViewInit, OnDestroy {
  private menuStateService = inject(MenuStateService);
  private platformId = inject(PLATFORM_ID);
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private observer?: IntersectionObserver;

  isVisible = false;
  private hasStarted = false;

  // Imagen única de identidad
  showcaseImage = {
    url: 'assets/images/identidad/identidad.jpg',
    alt: 'Plaxtilineas - Plásticos, Espumas, Mallas y Empaques'
  };

  // Frases dinámicas con efecto máquina de escribir
  phrases: string[] = [
    'con altos niveles de calidad',
    'para fincas y agroindustria',
    'para obras de construcción',
    'para tapicería y empaque'
  ];
  currentPhraseIndex = 0;
  displayedText = '';
  isDeleting = false;
  private typewriterTimer: any;

  ejesPrincipales: EjePrincipal[] = [
    {
      nombre: 'Peletería & Tapicería',
      detalle: 'Espumas D20 a D30, cueros y pegantes Afix',
      link: '/productos'
    },
    {
      nombre: 'Plásticos & Mallas',
      detalle: 'Polisombras del 35% al 80% para agro y obra',
      link: '/busqueda',
      queryParams: { q: 'plastico' }
    },
    {
      nombre: 'Empaques & Embalaje',
      detalle: 'Cajas de cartón, vinipel stretch y plástico burbuja',
      link: '/productos'
    },
    {
      nombre: 'Logística Regional',
      detalle: 'Despachos oportunos en todo el Eje Cafetero',
      link: '/busqueda',
      queryParams: { q: 'carton' }
    }
  ];

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.displayedText = this.phrases[0];
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
      this.isVisible = true;
      this.startTypewriter();
      return;
    }

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
      {
        root: null,
        threshold: 0.15
      }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.pauseTypewriter();
    if (this.observer) {
      this.observer.disconnect();
    }
  }

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
    if (!this.isBrowser) return;
    if (this.typewriterTimer) return; // Ya en ejecución activa

    if (!this.hasStarted) {
      this.hasStarted = true;
      // Pausa elegante al ingresar al viewport para apreciar el inicio
      this.typewriterTimer = setTimeout(() => {
        this.typeNextChar();
      }, 300);
    } else {
      // Reanuda suavemente donde se quedó
      this.typewriterTimer = setTimeout(() => {
        this.typeNextChar();
      }, 100);
    }
  }

  private typeNextChar(): void {
    if (!this.isVisible) {
      return;
    }

    const fullPhrase = this.phrases[this.currentPhraseIndex];

    if (this.isDeleting) {
      this.displayedText = fullPhrase.substring(0, this.displayedText.length - 1);
    } else {
      this.displayedText = fullPhrase.substring(0, this.displayedText.length + 1);
    }

    this.cdr.markForCheck();

    let speed = this.isDeleting ? 40 : 85;

    if (!this.isDeleting && this.displayedText === fullPhrase) {
      speed = 2200; // Pausa elegante cuando completa la frase
      this.isDeleting = true;
    } else if (this.isDeleting && this.displayedText === '') {
      this.isDeleting = false;
      this.currentPhraseIndex = (this.currentPhraseIndex + 1) % this.phrases.length;
      speed = 450; // Pausa antes de empezar a escribir la siguiente
    }

    this.typewriterTimer = setTimeout(() => this.typeNextChar(), speed);
  }

  limpiarFiltros(): void {
    this.menuStateService.clearLastSelectedSubcategory();
  }
}
