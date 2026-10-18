import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Componente de Inicio principal
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { HeaderComponent } from '../../features/home/hero/header.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';

import { CategoriasDestacadasComponent } from '../../features/home/categorias-destacadas/categorias-destacadas.component';
import { FeatureBanner } from '../../features/home/feature-banner/feature-banner';
import { PlaxtiTrioPresentationComponent } from '../../features/home/trio-presentation/trio-presentation';

import { ContentCard } from '../../models/content-card.model';
import { SolucionesBannerComponent } from '../../features/home/soluciones-banner/soluciones-banner.component';
import { FeatureNewProducts } from '../../features/home/feature-new-products/feature-new-products';
import { FullBanner } from '../../features/dynamic/full-banner/full-banner';
import { LongMap } from '../../features/dynamic/long-map/long-map.component';
import { UtilGridProducto } from '../../features/products/grid-producto/util-grid-producto/util-grid-producto';
import { UtilGridProductoOther } from "../../features/products/grid-producto/util-grid-producto-other/util-grid-producto-other";
import { NosotrosInicioComponent } from '../../features/home/nosotros-inicio/nosotros-inicio.component';
import { BannerAsistenteComponent } from '../../features/home/banner-asistente/banner-asistente.component';
import { ComponentesService, ComponenteDinamico } from '../../services/componentes.service';
import { MeshBannerComponent } from '../../features/home/mesh-banner/mesh-banner.component';

// Nuevos componentes dinámicos
import { DynamicGaleriaComponent } from '../../features/dynamic/dynamic-galeria/dynamic-galeria.component';
import { DynamicProductCarouselComponent } from '../../features/dynamic/dynamic-product-carousel/dynamic-product-carousel.component';
import { ProductFeatureSplitComponent } from '../../features/home/product-feature-split/product-feature-split.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    HeaderComponent,
    Footer,
    SocialButtonsComponent,
    LongMap,
    CategoriasDestacadasComponent,
    MeshBannerComponent,
    SolucionesBannerComponent,
    FeatureNewProducts,
    FullBanner,
    UtilGridProductoOther,
    NosotrosInicioComponent,
    DynamicGaleriaComponent,
    DynamicProductCarouselComponent,
    ProductFeatureSplitComponent
  ],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class Inicio implements OnInit {



  // Datos para el componente Trio Presentation - Servicios
  serviciosCards: ContentCard[] = [
    {
      imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767456920/tienda_ry4isp.jpg',
      altText: 'Venta de insumos industriales',
      title: 'Venta de Insumos',
      description: 'Amplio catálogo de productos esenciales para la industria con calidad garantizada.',
      link: '/productos',
      textPosition: 'bottom'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767456929/envio5_pa3o2m.jpg',
      altText: 'Distribución logística',
      title: 'Logística y Distribución',
      description: 'Servicio de distribución eficiente y puntual a lo largo de todo el territorio nacional.',
      link: '/contacto',
      textPosition: 'center'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768349740/asesoria_oledy6.jpg',
      altText: 'Asesoramiento técnico',
      title: 'Asesoría',
      description: 'Expertos disponibles para brindar soluciones personalizadas a tus necesidades.',
      link: '/contacto',
      textPosition: 'bottom'
    }
  ];

  // Componentes dinámicos cargados de la base de datos
  componentesDinamicos: ComponenteDinamico[] = [];

  public authService = inject(AuthService);

  constructor(private componentesService: ComponentesService) { }

  ngOnInit(): void {
    // Aseguramos el fondo blanco estático
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#FFFFFF';
      document.documentElement.style.backgroundColor = '#FFFFFF';
    }

    this.cargarComponentesDinamicos();
  }

  cargarComponentesDinamicos(): void {
    this.componentesService.getComponentes().subscribe({
      next: (res: any) => {
        // Filtrar y guardar solo componentes activos
        const datos = res.data || res;
        this.componentesDinamicos = (datos as ComponenteDinamico[]).filter(c => c.activo == 1 || c.activo === true);
        console.log('✅ Componentes dinámicos cargados con éxito en la Landing Page:', this.componentesDinamicos);
      },
      error: (err) => {
        console.error('❌ Error al obtener componentes dinámicos para el Inicio:', err);
      }
    });
  }

  getBullets(comp: any): string[] {
    const list = comp.contenido?.caracteristicas || '';
    if (!list) return [];
    return list.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0);
  }
}