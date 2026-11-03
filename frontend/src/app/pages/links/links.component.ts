import {
  Component,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { LinksCarouselComponent } from './links-carousel/links-carousel.component';

export interface QuickLinkItem {
  id: string;
  title: string;
  subtitle: string;
  iconType: 'instagram' | 'facebook' | 'location' | 'espumas' | 'catalog' | 'review';
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
  imports: [CommonModule, RouterModule, LinksCarouselComponent],
  templateUrl: './links.component.html',
  styleUrls: ['./links.component.css']
})
export class LinksComponent implements OnInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  copiedToast = false;
  private copyTimeout: any = null;

  // Imagen HD de fondo oscurecida + Logo Blanco
  showcaseVisual = {
    imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1793246685/plaxti-links_am0zvu.jpg',
    logoUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png',
    alt: 'Plaxtilíneas Plásticos Industriales'
  };

  // Botón Principal Destacado: Catálogo
  readonly featuredLink: QuickLinkItem = {
    id: 'catalogo',
    title: 'Catálogo de Productos',
    subtitle: 'Plásticos, Espumas & Empaques',
    iconType: 'catalog',
    targetUrl: '/productos',
    isExternal: false,
    highlight: true
  };

  // Enlaces Minimalistas
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
      id: 'resena',
      title: 'Dejar una Reseña',
      subtitle: 'Tu opinión en Google nos ayuda a crecer',
      iconType: 'review',
      themeClass: 'theme-review',
      targetUrl: '#',
      isExternal: true
    },
    {
      id: 'espumas',
      title: 'Espumas & Plásticos',
      subtitle: 'Corte Industrial',
      iconType: 'espumas',
      themeClass: 'theme-espumas',
      logoUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1793293522/espumas-iconos_jfqu9u.png',
      targetUrl: 'https://espumasyplasticos.com/',
      isExternal: true
    }
  ];

  ngOnInit(): void {
    this.titleService.setTitle('Enlaces Oficiales — Grupo Plaxtilíneas');
    this.metaService.updateTag({
      name: 'description',
      content: 'Portal oficial de enlaces del Grupo Plaxtilíneas. Catálogo oficial, redes sociales, ubicación y atención directa.'
    });

    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    }
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
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
