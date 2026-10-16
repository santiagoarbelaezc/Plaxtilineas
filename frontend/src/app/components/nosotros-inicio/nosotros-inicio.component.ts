import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  faBox, 
  faBoxOpen, 
  faTruck, 
  faLayerGroup, 
  faChevronLeft, 
  faChevronRight,
  faAward,
  faShieldHalved,
  faArrowRight,
  faBuildingColumns
} from '@fortawesome/free-solid-svg-icons';
import { MenuStateService } from '../../services/menu-state.service';

export interface SlideIdentidad {
  id: string;
  tabLabel: string;
  badge: string;
  region: string;
  titulo: string;
  subtitulo: string;
  lead: string;
  stats?: { valor: string; etiqueta: string }[];
  puntosClave: { 
    icono: string; 
    titulo: string; 
    detalle: string; 
    link: string; 
    queryParams?: any; 
  }[];
  seoTags: string[];
  ctaText: string;
  ctaLink: string;
  ctaQueryParams?: any;
}

@Component({
  selector: 'app-nosotros-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './nosotros-inicio.component.html',
  styleUrls: ['./nosotros-inicio.component.css']
})
export class NosotrosInicioComponent implements OnInit, OnDestroy {
  private menuStateService = inject(MenuStateService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  currentSlide = 0;
  private autoplayInterval: any;
  readonly AUTOPLAY_TIME = 7000;

  slides: SlideIdentidad[] = [
    {
      id: 'trayectoria',
      tabLabel: 'Nuestra Historia',
      badge: '+20 Años en el Eje Cafetero',
      region: 'ARMENIA • PEREIRA • MANIZALES',
      titulo: 'Dos décadas impulsando la industria y el comercio regional',
      subtitulo: 'Plaxtilineas: Solidez, Confianza y Calidad Garantizada',
      lead: 'Desde nuestra sede principal en Armenia (Quindío), nos consolidamos como el principal aliado estratégico de empresas, talleres y hogares en el Eje Cafetero y toda Colombia, suministrando materiales de alta durabilidad con atención inmediata y personalizada.',
      stats: [
        { valor: '+20', etiqueta: 'Años de Experiencia' },
        { valor: '100%', etiqueta: 'Calidad Certificada' },
        { valor: '+5.000', etiqueta: 'Clientes Activos' }
      ],
      puntosClave: [
        {
          icono: 'peleteria',
          titulo: 'Peletería & Calzado',
          detalle: 'Cueros sintéticos y pegantes Afix',
          link: '/productos'
        },
        {
          icono: 'plastico',
          titulo: 'Plásticos & Agro',
          detalle: 'Mallas polisombra y filmes HDPE',
          link: '/busqueda',
          queryParams: { q: 'plastico' }
        },
        {
          icono: 'empaque',
          titulo: 'Empaques Seguros',
          detalle: 'Cajas de cartón y vinipel stretch',
          link: '/productos'
        },
        {
          icono: 'logistica',
          titulo: 'Logística Ágil',
          detalle: 'Despachos locales y nacionales',
          link: '/busqueda',
          queryParams: { q: 'carton' }
        }
      ],
      seoTags: ['Plaxtilineas Eje Cafetero', 'Empresas en Armenia Quindío', 'Venta por Mayor y Menor', 'Materiales Industriales'],
      ctaText: 'Ver Catálogo Completo',
      ctaLink: '/productos'
    },
    {
      id: 'peleteria',
      tabLabel: 'Peletería & Tapicería',
      badge: 'Línea Especializada',
      region: 'CALZADO, MUEBLES & MARROQUINERÍA',
      titulo: 'Insumos premium para tapicería, calzado y manufactura',
      subtitulo: 'Materiales Seleccionados para Acabados Profesionales',
      lead: 'Disponemos de un amplio portafolio de cueros sintéticos, vinilos automotrices, espumas de alta densidad, pegantes de contacto Afix PL285, cremalleras y herrajes, orientados a tapiceros expertos y fabricantes de calzado y marroquinería.',
      stats: [
        { valor: '+150', etiqueta: 'Tipos de Telas & Vinilos' },
        { valor: 'D20-D40', etiqueta: 'Densidades de Espuma' },
        { valor: 'Afix', etiqueta: 'Distribuidor Oficial' }
      ],
      puntosClave: [
        {
          icono: 'peleteria',
          titulo: 'Cueros Sintéticos',
          detalle: 'Vinilos de alta resistencia al roce',
          link: '/productos'
        },
        {
          icono: 'empaque',
          titulo: 'Pegantes Afix',
          detalle: 'Adhesivos de contacto PL285 y alta fuerza',
          link: '/busqueda',
          queryParams: { q: 'pegante' }
        },
        {
          icono: 'plastico',
          titulo: 'Espumas Industriales',
          detalle: 'Cojinería, colchonetas y tapizado',
          link: '/busqueda',
          queryParams: { q: 'espuma' }
        },
        {
          icono: 'logistica',
          titulo: 'Herrajes & Insumos',
          detalle: 'Hilos, cremalleras y accesorios',
          link: '/productos'
        }
      ],
      seoTags: ['Peletería en Armenia', 'Cueros Sintéticos Eje Cafetero', 'Pegante Afix', 'Espumas para Muebles'],
      ctaText: 'Explorar Insumos de Peletería',
      ctaLink: '/productos'
    },
    {
      id: 'plasticos',
      tabLabel: 'Plásticos & Agro',
      badge: 'Soluciones Perimetrales & Coberturas',
      region: 'AGRO, CONSTRUCCIÓN & HOGAR',
      titulo: 'Plásticos de alta resistencia, mallas y protección perimetral',
      subtitulo: 'Películas con Protección UV y Polietileno Virgen',
      lead: 'Protege cultivos, obras civiles e instalaciones con nuestra línea de mallas polisombra al 35%, 50%, 65% y 80%, plásticos para invernadero calibre 6 y 8, geomembranas impermeabilizantes y tuberías flexibles.',
      stats: [
        { valor: 'UV+', etiqueta: 'Filtro Solar Prolongado' },
        { valor: '35%-80%', etiqueta: 'Porcentajes de Sombra' },
        { valor: 'HDPE', etiqueta: 'Polietileno Virgen' }
      ],
      puntosClave: [
        {
          icono: 'plastico',
          titulo: 'Mallas Polisombra',
          detalle: 'Negra, verde y cerramiento perimetral',
          link: '/busqueda',
          queryParams: { q: 'polisombra' }
        },
        {
          icono: 'empaque',
          titulo: 'Plásticos para Agro',
          detalle: 'Invernadero térmico y acolchados',
          link: '/busqueda',
          queryParams: { q: 'plastico' }
        },
        {
          icono: 'peleteria',
          titulo: 'Geomembranas',
          detalle: 'Impermeabilización de tanques y reservorios',
          link: '/productos'
        },
        {
          icono: 'logistica',
          titulo: 'Mangueras & Ductos',
          detalle: 'Riego agrícola y conducción de fluidos',
          link: '/busqueda',
          queryParams: { q: 'manguera' }
        }
      ],
      seoTags: ['Mallas Polisombra Armenia', 'Plásticos Invernadero Quindío', 'Geomembranas Eje Cafetero', 'Coberturas HDPE'],
      ctaText: 'Ver Catálogo de Plásticos',
      ctaLink: '/busqueda',
      ctaQueryParams: { q: 'plastico' }
    },
    {
      id: 'empaques',
      tabLabel: 'Empaques & Embalaje',
      badge: 'Embalaje Seguro y Confiable',
      region: 'E-COMMERCE & INDUSTRIA',
      titulo: 'Cajas de cartón corrugado, burbuja y vinipel stretch',
      subtitulo: 'Garantiza la Seguridad de tus Envíos y Productos',
      lead: 'Especialistas en materiales de empaque para logística comercial, mudanzas y despachos e-commerce. Cajas en cartón sencillo y doble pared, plástico burbuja sellado, zunchos plásticos y cintas de embalaje de alto agarre.',
      stats: [
        { valor: '+40', etiqueta: 'Medidas de Cajas' },
        { valor: '100%', etiqueta: 'Reciclable y Biodegradable' },
        { valor: 'Stretch', etiqueta: 'Manual y para Máquina' }
      ],
      puntosClave: [
        {
          icono: 'empaque',
          titulo: 'Cajas de Cartón',
          detalle: 'Calibres resistentes para envíos y archivo',
          link: '/busqueda',
          queryParams: { q: 'carton' }
        },
        {
          icono: 'plastico',
          titulo: 'Plástico Burbuja',
          detalle: 'Amortiguación de impactos frágiles',
          link: '/busqueda',
          queryParams: { q: 'burbuja' }
        },
        {
          icono: 'peleteria',
          titulo: 'Vinipel Stretch',
          detalle: 'Película estirable transparente y negra',
          link: '/busqueda',
          queryParams: { q: 'vinipel' }
        },
        {
          icono: 'logistica',
          titulo: 'Cintas & Zunchos',
          detalle: 'Adhesivos transparentes, café y zuncho pet',
          link: '/busqueda',
          queryParams: { q: 'cinta' }
        }
      ],
      seoTags: ['Cajas de Cartón Armenia', 'Plástico Burbuja Eje Cafetero', 'Vinipel Stretch Film', 'Empaques Colombia'],
      ctaText: 'Ver Soluciones de Empaque',
      ctaLink: '/productos'
    },
    {
      id: 'logistica',
      tabLabel: 'Logística & Cobertura',
      badge: 'Entregas Rápidas y Asesoría Técnica',
      region: 'DESPACHOS A TODA COLOMBIA',
      titulo: 'Entregas ágiles locales y cobertura logística nacional',
      subtitulo: 'Eficiencia en Tiempos y Costos para tu Negocio',
      lead: 'Contamos con flota propia de reparto en Armenia y el departamento del Quindío, junto con convenios con las principales transportadoras terrestres del país para garantizar que tus pedidos lleguen a tiempo y en óptimas condiciones.',
      stats: [
        { valor: '24-48h', etiqueta: 'Tiempos de Entrega Local' },
        { valor: 'Nacional', etiqueta: 'Cobertura en Colombia' },
        { valor: 'Directa', etiqueta: 'Asesoría vía WhatsApp' }
      ],
      puntosClave: [
        {
          icono: 'logistica',
          titulo: 'Despachos Locales',
          detalle: 'Armenia, Calarcá, Montenegro y Quindío',
          link: '/contacto'
        },
        {
          icono: 'empaque',
          titulo: 'Envíos Nacionales',
          detalle: 'Alianzas con Servientrega, Envia e Interrapidísimo',
          link: '/nosotros'
        },
        {
          icono: 'plastico',
          titulo: 'Facturación Legal',
          detalle: 'Facturación Electrónica DIAN garantizada',
          link: '/terminos'
        },
        {
          icono: 'peleteria',
          titulo: 'Cotización Inmediata',
          detalle: 'Asesores comerciales y asistente Mateo IA',
          link: '/contacto'
        }
      ],
      seoTags: ['Distribución en Armenia', 'Despachos Eje Cafetero', 'Proveedor Confiable Colombia', 'Atención Empresas'],
      ctaText: 'Contactar un Asesor',
      ctaLink: '/contacto'
    }
  ];

  constructor(library: FaIconLibrary) {
    library.addIcons(
      faBox, 
      faBoxOpen, 
      faTruck, 
      faLayerGroup, 
      faChevronLeft, 
      faChevronRight,
      faAward,
      faShieldHalved,
      faArrowRight,
      faBuildingColumns
    );
  }

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  startAutoplay(): void {
    if (!this.isBrowser) return;
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, this.AUTOPLAY_TIME);
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = (index + this.slides.length) % this.slides.length;
    this.startAutoplay();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  limpiarFiltros(): void {
    this.menuStateService.clearLastSelectedSubcategory();
  }
}
