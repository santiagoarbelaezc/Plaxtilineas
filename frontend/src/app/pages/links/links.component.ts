import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ElementRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { FeatureNewProducts } from '../../features/home/feature-new-products/feature-new-products';

export interface QuickLinkItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  iconType: 'instagram' | 'facebook' | 'location' | 'espumas' | 'catalog';
  themeClass?: string;
  logoUrl?: string;
  invertLogo?: boolean;
  targetUrl: string;
  isExternal: boolean;
  highlight?: boolean;
}

@Component({
  selector: 'app-links',
  standalone: true,
  imports: [CommonModule, RouterModule, FeatureNewProducts],
  templateUrl: './links.component.html',
  styleUrls: ['./links.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinksComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private hostEl = inject(ElementRef);

  copiedToast = false;
  private copyTimeout: any = null;
  private scrollObserver: IntersectionObserver | null = null;

  // Coordenadas sutiles para efecto parallax en la imagen hero (Desktop)
  parallaxX = 0;
  parallaxY = 0;

  // Imagen HD de plásticos industriales para Plaxtilíneas + Logo Grande
  showcaseVisual = {
    imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1793246685/plaxti-links_am0zvu.jpg',
    logoUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png',
    alt: 'Plaxtilíneas Expertos en Plásticos Industriales y Empaques'
  };

  // Tarjeta Destacada Superior (Ancho Completo - Fondo Blanco Minimalista)
  readonly featuredLink: QuickLinkItem = {
    id: 'catalogo',
    title: 'Descubre Nuestro Catálogo',
    subtitle: 'Plásticos, Espumas & Empaques',
    badge: 'Oficial',
    iconType: 'catalog',
    targetUrl: '/productos',
    isExternal: false,
    highlight: true
  };

  // Grilla Minimalista 2x2 con Contorno y Color Distintivo por Botón
  readonly gridLinks: QuickLinkItem[] = [
    {
      id: 'instagram',
      title: 'Instagram',
      subtitle: '@plaxtilineas',
      iconType: 'instagram',
      themeClass: 'theme-instagram',
      targetUrl: 'https://www.instagram.com/plaxtilineas/',
      isExternal: true
    },
    {
      id: 'facebook',
      title: 'Facebook',
      subtitle: 'Plaxtilíneas Oficial',
      iconType: 'facebook',
      themeClass: 'theme-facebook',
      targetUrl: 'https://www.facebook.com/p/Plaxtilineas-100080040966300/',
      isExternal: true
    },
    {
      id: 'ubicacion',
      title: 'Google Maps',
      subtitle: 'Sede Armenia, Quindío',
      iconType: 'location',
      themeClass: 'theme-maps',
      targetUrl: 'https://www.google.com/maps/dir/4.5696779,-75.6521222/PLAXTILINEAS,+630001,+Armenia,+Quind%C3%ADo/@4.553645,-75.6819289,14z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x8e38f5bd543fc99f:0x2bd98af1d04068f8!2m2!1d-75.6749092!2d4.5355891?entry=ttu',
      isExternal: true
    },
    {
      id: 'espumas',
      title: 'Espumas & Plásticos',
      subtitle: 'Corte Industrial',
      iconType: 'espumas',
      themeClass: 'theme-espumas',
      logoUrl: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792788733/logo-grande_qauprn.png',
      invertLogo: true,
      targetUrl: 'https://espumasyplasticos.com/',
      isExternal: true
    }
  ];

  // Compatibilidad con lista completa
  get quickLinks(): QuickLinkItem[] {
    return [this.featuredLink, ...this.gridLinks];
  }

  ngOnInit(): void {
    this.titleService.setTitle('Enlaces Oficiales — Grupo Plaxtilíneas');
    this.metaService.updateTag({
      name: 'description',
      content: 'Portal oficial de enlaces del Grupo Empresarial Plaxtilíneas. Accede a nuestro catálogo, redes sociales, ubicación y Espumas y Plásticos.'
    });

    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#ffffff';
      document.documentElement.style.backgroundColor = '#ffffff';
    }
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }

  private initScrollReveal(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      const allEls = this.hostEl.nativeElement.querySelectorAll('[data-reveal]');
      allEls.forEach((el: HTMLElement) => el.classList.add('is-visible'));
      return;
    }

    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.scrollObserver?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -24px 0px'
      }
    );

    const targets = this.hostEl.nativeElement.querySelectorAll('[data-reveal]');
    targets.forEach((el: HTMLElement) => this.scrollObserver?.observe(el));
  }

  onVisualMouseMove(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    if (!card || window.innerWidth <= 768) return;
    const rect = card.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    this.parallaxX = Math.round(relX * 14);
    this.parallaxY = Math.round(relY * 14);
  }

  onVisualMouseLeave(): void {
    this.parallaxX = 0;
    this.parallaxY = 0;
  }

  copyPageLink(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.triggerCopiedToast();
      }).catch(() => {
        this.fallbackCopy();
      });
    } else {
      this.fallbackCopy();
    }
  }

  private fallbackCopy(): void {
    if (typeof document !== 'undefined') {
      const el = document.createElement('textarea');
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.triggerCopiedToast();
    }
  }

  private triggerCopiedToast(): void {
    this.copiedToast = true;
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.copyTimeout = setTimeout(() => {
      this.copiedToast = false;
    }, 2800);
  }

  sharePage(): void {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({
        title: 'Grupo Plaxtilíneas — Enlaces Oficiales',
        text: 'Portal oficial de enlaces y marcas del Grupo Plaxtilíneas',
        url: window.location.href
      }).catch(() => {
        this.copyPageLink();
      });
    } else {
      this.copyPageLink();
    }
  }
}
