import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

export interface QuickLinkItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  iconType: 'plaxtilineas' | 'camascotas' | 'espumas' | 'districol' | 'whatsapp' | 'catalog' | 'location';
  logoUrl?: string;
  targetUrl: string;
  isExternal: boolean;
  highlight?: boolean;
}

export interface BrandFeatureBullet {
  title: string;
  desc: string;
}

export interface BrandFeatureBlock {
  id: string;
  kicker: string;
  titleLead: string;
  titleHighlight: string;
  description: string;
  bullets: BrandFeatureBullet[];
  imageUrl: string;
  imageAlt: string;
  linkUrl: string;
  linkText: string;
  isExternal: boolean;
  imagePosition: 'left' | 'right';
  badgeTag: string;
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

  // Enlaces rápidos tipo Linktree
  readonly quickLinks: QuickLinkItem[] = [
    {
      id: 'plaxtilineas',
      title: 'Plaxtilíneas Oficial',
      subtitle: 'Tienda virtual, empaques, aislantes y plásticos',
      badge: 'Principal',
      iconType: 'plaxtilineas',
      logoUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png',
      targetUrl: '/',
      isExternal: false,
      highlight: true
    },
    {
      id: 'camascotas',
      title: 'Camascotas',
      subtitle: 'Línea pet care, camas ortopédicas y confort animal',
      badge: 'Pet Care',
      iconType: 'camascotas',
      logoUrl: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796946/logo2_hrboyb.png',
      targetUrl: 'https://camascotas.com/',
      isExternal: true
    },
    {
      id: 'districol',
      title: 'Colchones Districol',
      subtitle: 'Confort anatómico, colchonería y descanso ortopédico',
      badge: 'Confort',
      iconType: 'districol',
      logoUrl: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796538/logo-distri_ri8lkq.png',
      targetUrl: 'https://colchonesdistricol.com/',
      isExternal: true
    },
    {
      id: 'espumas',
      title: 'Espumas y Plásticos',
      subtitle: 'Transformación, corte a medida y densidades industriales',
      badge: 'Industrial',
      iconType: 'espumas',
      logoUrl: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792788733/logo-grande_qauprn.png',
      targetUrl: 'https://espumasyplasticos.com/',
      isExternal: true
    },
    {
      id: 'catalogo',
      title: 'Catálogo de Productos',
      subtitle: 'Explora todos los materiales, calibres y especificaciones',
      badge: 'Catálogo',
      iconType: 'catalog',
      targetUrl: '/productos',
      isExternal: false
    },
    {
      id: 'whatsapp',
      title: 'Línea Directa WhatsApp',
      subtitle: 'Asesoría comercial personalizada y cotizaciones',
      badge: 'En línea',
      iconType: 'whatsapp',
      targetUrl: 'https://api.whatsapp.com/send/?phone=573007365939&text=Hola%20Grupo%20Plaxtil%C3%ADneas,%20deseo%20informaci%C3%B3n%20sobre%20sus%20productos%20y%20marcas.',
      isExternal: true
    },
    {
      id: 'ubicacion',
      title: 'Sede Principal & Tienda Física',
      subtitle: 'Cra. 19 #19-35, Armenia, Quindío — Lun a Sáb 8am a 6pm',
      badge: 'Armenia',
      iconType: 'location',
      targetUrl: 'https://www.google.com/maps/dir/4.5696779,-75.6521222/PLAXTILINEAS,+630001,+Armenia,+Quind%C3%ADo/@4.553645,-75.6819289,14z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x8e38f5bd543fc99f:0x2bd98af1d04068f8!2m2!1d-75.6749092!2d4.5355891?entry=ttu',
      isExternal: true
    }
  ];

  // Bloques editoriales divididos con el diseño exacto de los componentes del home
  readonly brandBlocks: BrandFeatureBlock[] = [
    {
      id: 'block-plaxtilineas',
      kicker: 'LÍNEA AGRO & CONSTRUCCIÓN',
      titleLead: 'PLAXTILÍNEAS',
      titleHighlight: 'Mallas, Aislantes Térmicos & Empaques',
      description: 'Mallas tejidas en polietileno de alta densidad con aditivos anti-UV y aislantes reflectivos Yumbolón. Diseñadas para control térmico, sombra en cultivos, cerramientos perimetrales y protección industrial.',
      bullets: [
        {
          title: 'Control Solar',
          desc: 'Porcentajes de sombra del 35% al 80% para café, hortalizas y viveros.'
        },
        {
          title: 'Aislamiento Térmico',
          desc: 'Yumbolón bajo techo con foil de aluminio que reduce de 6°C a 8°C y atenúa el ruido de lluvia.'
        },
        {
          title: 'Durabilidad Certificada',
          desc: 'Resistentes a vientos fuertes, lluvia ácida y radiación continua en campo y obra.'
        }
      ],
      imageUrl: 'assets/images/plasticos_tienda.png',
      imageAlt: 'Sede y materiales de Plaxtilineas',
      linkUrl: '/',
      linkText: 'VISITAR PLAXTILÍNEAS WEB',
      isExternal: false,
      imagePosition: 'left',
      badgeTag: 'MATRIZ'
    },
    {
      id: 'block-camascotas',
      kicker: 'LÍNEA PET CARE & DESCANSO ANIMAL',
      titleLead: 'CAMASCOTAS',
      titleHighlight: 'Camas Ortopédicas & Bienestar Pet',
      description: 'Camas ortopédicas, colchonetas impermeables y accesorios ergonómicos diseñados con amor para el descanso saludable y el cuidado de las articulaciones de tus mascotas.',
      bullets: [
        {
          title: 'Espumas Ortopédicas',
          desc: 'Estructuras de alta resiliencia que alivian puntos de presión y cuidan la columna de tu mascota.'
        },
        {
          title: 'Telas Antifluidos',
          desc: 'Fundas lavables con cremallera resistentes al agua, rasgaduras y olores.'
        },
        {
          title: 'Fabricación Exclusiva',
          desc: 'Diseños anatómicos y acabados para todas las razas y tamaños.'
        }
      ],
      imageUrl: 'assets/images/grupoempresas/camascotas.png',
      imageAlt: 'Camascotas descanso animal ergonómico',
      linkUrl: 'https://camascotas.com/',
      linkText: 'VISITAR CAMASCOTAS.COM',
      isExternal: true,
      imagePosition: 'right',
      badgeTag: 'PET CARE'
    },
    {
      id: 'block-districol',
      kicker: 'CONFORT & DESCANSO ORTOPÉDICO',
      titleLead: 'COLCHONES DISTRICOL',
      titleHighlight: 'Ergonomía, Firmeza & Alta Densidad',
      description: 'Línea de descanso ortopédico y anatómico diseñada con espumas de alta resiliencia para una postura óptima, soporte lumbar inigualable y un sueño reparador continuo.',
      bullets: [
        {
          title: 'Núcleos Certificados',
          desc: 'Espumas de alta densidad que garantizan soporte postural y previenen hundimientos.'
        },
        {
          title: 'Tratamiento Hipoalergénico',
          desc: 'Telas transpirables con protección antiácaros y textura ultra suave.'
        },
        {
          title: 'Garantía Directa de Fábrica',
          desc: 'Fabricación nacional bajo rigurosos estándares de ergonomía y durabilidad.'
        }
      ],
      imageUrl: 'assets/images/grupoempresas/districol.png',
      imageAlt: 'Colchones Districol confort ortopédico',
      linkUrl: 'https://colchonesdistricol.com/',
      linkText: 'VISITAR DISTRICOL.COM',
      isExternal: true,
      imagePosition: 'left',
      badgeTag: 'CONFORT'
    },
    {
      id: 'block-espumas',
      kicker: 'MATERIA PRIMA & CORTE INDUSTRIAL',
      titleLead: 'ESPUMAS Y PLÁSTICOS',
      titleHighlight: 'Transformación & Densidades Técnicas',
      description: 'Transformación técnica, corte exacto a medida y distribución mayorista de espumas industriales en densidades D20 a D30, plásticos técnicos y bobinas para diversas industrias.',
      bullets: [
        {
          title: 'Corte a la Medida',
          desc: 'Bloques, láminas y siluetas para tapicería, colchonería y proyectos de embalaje.'
        },
        {
          title: 'Densidades D20 a D30',
          desc: 'Disponibilidad permanente de insumos con propiedades mecánicas constantes.'
        },
        {
          title: 'Venta Mayorista',
          desc: 'Tarifas especiales para fábricas, talleres y distribuidores a nivel regional y nacional.'
        }
      ],
      imageUrl: 'assets/images/grupoempresas/espumas.png',
      imageAlt: 'Espumas y Plásticos corte industrial',
      linkUrl: 'https://espumasyplasticos.com/',
      linkText: 'VISITAR ESPUMAS Y PLÁSTICOS',
      isExternal: true,
      imagePosition: 'right',
      badgeTag: 'INDUSTRIAL'
    }
  ];

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
