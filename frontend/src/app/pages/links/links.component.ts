import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

export interface QuickLinkItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  iconType: 'plaxtilineas' | 'camascotas' | 'espumas' | 'districol' | 'whatsapp' | 'catalog' | 'location' | 'instagram';
  logoUrl?: string;
  targetUrl: string;
  isExternal: boolean;
  highlight?: boolean;
}

@Component({
  selector: 'app-links',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './links.component.html',
  styleUrls: ['./links.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinksComponent implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private router = inject(Router);

  copiedToast = false;
  private copyTimeout: any = null;

  // Imagen HD de plásticos industriales para Plaxtilíneas + Logo Grande
  showcaseVisual = {
    imageUrl: 'assets/images/hero/hero-plasticos-hd.jpg',
    logoUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png',
    alt: 'Plaxtilíneas Expertos en Plásticos Industriales y Empaques',
    tag: 'Sede Principal · Armenia',
    badge: 'Atención Inmediata'
  };

  // Tarjeta Destacada Superior (Ancho Completo - Fondo Blanco)
  readonly featuredLink: QuickLinkItem = {
    id: 'catalogo',
    title: 'Descubre Nuestro Catálogo',
    subtitle: 'Plásticos, Espumas, Empaques y Aislantes',
    badge: 'Oficial',
    iconType: 'catalog',
    targetUrl: '/productos',
    isExternal: false,
    highlight: true
  };

  // Grilla de Enlaces Minimalistas (2 Columnas - Botones Negros con Letra Blanca)
  readonly gridLinks: QuickLinkItem[] = [
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Chat & Asesoría',
      iconType: 'whatsapp',
      targetUrl: 'https://api.whatsapp.com/send/?phone=573007365939&text=Hola%20Grupo%20Plaxtil%C3%ADneas,%20deseo%20informaci%C3%B3n%20sobre%20sus%20productos%20y%20marcas.',
      isExternal: true
    },
    {
      id: 'instagram',
      title: 'Instagram',
      subtitle: '@plaxtilineas',
      iconType: 'instagram',
      targetUrl: 'https://instagram.com',
      isExternal: true
    },
    {
      id: 'camascotas',
      title: 'Camascotas',
      subtitle: 'Camas & Confort Pet',
      iconType: 'camascotas',
      logoUrl: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796946/logo2_hrboyb.png',
      targetUrl: 'https://camascotas.com/',
      isExternal: true
    },
    {
      id: 'districol',
      title: 'Colchones Districol',
      subtitle: 'Descanso Ergonómico',
      iconType: 'districol',
      logoUrl: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796538/logo-distri_ri8lkq.png',
      targetUrl: 'https://colchonesdistricol.com/',
      isExternal: true
    },
    {
      id: 'espumas',
      title: 'Espumas & Plásticos',
      subtitle: 'Corte Industrial',
      iconType: 'espumas',
      logoUrl: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792788733/logo-grande_qauprn.png',
      targetUrl: 'https://espumasyplasticos.com/',
      isExternal: true
    },
    {
      id: 'ubicacion',
      title: 'Sede Principal',
      subtitle: 'Armenia, Quindío',
      iconType: 'location',
      targetUrl: 'https://www.google.com/maps/dir/4.5696779,-75.6521222/PLAXTILINEAS,+630001,+Armenia,+Quind%C3%ADo/@4.553645,-75.6819289,14z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x8e38f5bd543fc99f:0x2bd98af1d04068f8!2m2!1d-75.6749092!2d4.5355891?entry=ttu',
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
      content: 'Portal oficial de enlaces del Grupo Empresarial Plaxtilíneas. Accede a Plaxtilíneas, Camascotas, Colchones Districol, Espumas y Plásticos y canales de atención.'
    });

    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#ffffff';
      document.documentElement.style.backgroundColor = '#ffffff';
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
