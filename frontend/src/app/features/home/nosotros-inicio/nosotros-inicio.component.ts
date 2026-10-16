import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuStateService } from '../../../services/menu-state.service';

export interface SlideIdentidad {
  id: string;
  tabLabel: string;
  badge: string;
  region: string;
  subtitulo: string;
  titulo: string;
  lead: string;
  detalles: string[];
  stats: { valor: string; etiqueta: string }[];
  ctaText: string;
  ctaLink: string;
  ctaQueryParams?: any;
}

@Component({
  selector: 'app-nosotros-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nosotros-inicio.component.html',
  styleUrls: ['./nosotros-inicio.component.css']
})
export class NosotrosInicioComponent implements OnInit, OnDestroy {
  private menuStateService = inject(MenuStateService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  currentSlide = 0;
  private autoplayInterval: any;
  readonly AUTOPLAY_TIME = 8000; // 8 segundos para lectura cómoda

  slides: SlideIdentidad[] = [
    {
      id: 'empaques',
      tabLabel: 'Empaques & Embalaje',
      badge: 'Línea de Embalaje & Logística',
      region: 'ARMENIA • PEREIRA • MANIZALES • DESPACHOS NACIONALES',
      subtitulo: 'Protección Integral para Envíos y Almacenamiento',
      titulo: 'Soluciones integrales en empaques, cartón y embalaje industrial',
      lead: 'En Plaxtilineas somos el aliado estratégico para empresas, comercios y hogares del Eje Cafetero. Suministramos materiales de embalaje de alta resistencia para asegurar la máxima protección de sus mercancías, envíos postales y mudanzas, con venta por mayor y al detal.',
      detalles: [
        'Cajas de cartón corrugado en calibres estándar y personalizadas para envíos seguros',
        'Rollos de plástico burbuja de alta absorción de impacto para artículos frágiles',
        'Vinipel / Stretch film transparente y negro para paletizado manual e industrial',
        'Cintas de empaque de alta adherencia, esquineros protectores y zunchos plásticos',
        'Bolsas de alta y baja densidad para mensajería, paquetería y comercio electrónico'
      ],
      stats: [
        { valor: '+20', etiqueta: 'Años de Experiencia Regional' },
        { valor: '100%', etiqueta: 'Calidad & Calibres Garantizados' },
        { valor: '+5.000', etiqueta: 'Clientes en el Eje Cafetero' }
      ],
      ctaText: 'Ver Productos de Empaque & Embalaje',
      ctaLink: '/productos'
    },
    {
      id: 'plasticos',
      tabLabel: 'Plásticos & Agroindustria',
      badge: 'Línea Agro & Construcción',
      region: 'EJE CAFETERO • COBERTURA REGIONAL & RURAL',
      subtitulo: 'Protección UV y Alta Durabilidad al Clima',
      titulo: 'Plásticos industriales, mallas polisombra y cubiertas técnicas',
      lead: 'Distribuimos plásticos técnicos y mallas agrícolas de máxima resistencia formuladas para el clima y la topografía del Quindío y el Eje Cafetero. Ofrecemos asesoría técnica para optimizar cultivos, cerramientos de obras de construcción y aislamiento de humedad.',
      detalles: [
        'Mallas polisombra con porcentaje de filtración de 35% al 80% para cultivos, viveros y parqueaderos',
        'Plásticos tubulares e invernaderos tratados con filtro UV para protección térmica y durabilidad prolongada',
        'Geomembranas y polietileno negro para cimentación, reservorios de agua y control de humedad',
        'Lonas impermeables de polipropileno y carpas reforzadas para intemperie',
        'Disponibilidad inmediata por rollos completos o por metraje según su necesidad'
      ],
      stats: [
        { valor: 'UV+', etiqueta: 'Protección Solar Certificada' },
        { valor: '35% a 80%', etiqueta: 'Niveles de Sombrío' },
        { valor: 'Mayor & Detal', etiqueta: 'Venta por Rollo o Metro' }
      ],
      ctaText: 'Ver Plásticos & Coberturas',
      ctaLink: '/busqueda',
      ctaQueryParams: { q: 'plastico' }
    },
    {
      id: 'peleteria',
      tabLabel: 'Peletería & Tapicería',
      badge: 'Línea de Tapicería & Manufactura',
      region: 'CALZADO • MUEBLES • MARROQUINERÍA • AUTOMOTRIZ',
      subtitulo: 'Materiales Seleccionados para Acabados Profesionales',
      titulo: 'Cueros sintéticos, espumas de alta densidad y pegantes industriales',
      lead: 'Ponemos a disposición de tapiceros, artesanos, confeccionistas y fábricas del Eje Cafetero un catálogo seleccionado de insumos de primera calidad para calzado, marroquinería y tapicería automotriz y de hogar.',
      detalles: [
        'Cueros sintéticos y vinilos automotrices resistentes al roce, agrietamiento y desgaste',
        'Espumas de poliuretano en bloques, láminas y cortes a medida (densidades D20, D23, D26 y D30)',
        'Pegantes de contacto industriales Afix PL285 con alto poder de adhesión inicial y final',
        'Cremalleras por metro, cursores, hilos de alta tenacidad y resortes para muebles',
        'Asesoría técnica para fabricantes de salas, comedores, colchonetas y calzado'
      ],
      stats: [
        { valor: 'D20 - D40', etiqueta: 'Densidades de Espuma' },
        { valor: 'Afix', etiqueta: 'Distribuidor Autorizado' },
        { valor: '+150', etiqueta: 'Diseños & Texturas' }
      ],
      ctaText: 'Ver Insumos de Peletería & Tapicería',
      ctaLink: '/productos'
    }
  ];

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
