import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Importa todos los componentes que quieres mostrar en la vista de inicio
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { Partners } from '../../components/partners/partners.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from '../../components/social-buttons/social-buttons.component';

import { CategoriasDestacadasComponent } from '../../components/categorias-destacadas/categorias-destacadas.component';
import { FeatureBanner } from '../../components/feature-banner/feature-banner';
import { PlaxtiTrioPresentationComponent } from '../../components/trio-presentation/trio-presentation';

import { ContentCard } from '../../models/content-card.model';
import { BannerImage, PlaxtiBannerComponent } from '../../components/banner/banner';
import { FeatureNewProducts } from '../../components/feature-new-products/feature-new-products';
import { CardContainerComponent } from '../../components/card-container/card-container';
import { FullBanner } from '../../components/full-banner/full-banner';
import { LongMap } from '../../components/long-map/long-map.component';
import { UtilGridProducto } from '../../components/grid-producto/util-grid-producto/util-grid-producto';
import { UtilGridProductoOther } from "../../components/grid-producto/util-grid-producto-other/util-grid-producto-other";
import { NosotrosInicioComponent } from '../../components/nosotros-inicio/nosotros-inicio.component';
import { BannerAsistenteComponent } from '../../components/banner-asistente/banner-asistente.component';
import { ComponentesService, ComponenteDinamico } from '../../services/componentes.service';
import { CategoryProductsCarouselComponent } from '../../components/category-products-carousel/category-products-carousel.component';
import { GrupoEmpresasComponent } from '../../components/grupo-empresas/grupo-empresas.component';
import { BannerRegistroComponent } from '../../components/banner-registro/banner-registro.component';

// Nuevos componentes dinámicos
import { DynamicTestimoniosComponent } from '../../components/dynamic-testimonios/dynamic-testimonios.component';
import { DynamicFaqComponent } from '../../components/dynamic-faq/dynamic-faq.component';
import { DynamicGaleriaComponent } from '../../components/dynamic-galeria/dynamic-galeria.component';
import { DynamicProductCarouselComponent } from '../../components/dynamic-product-carousel/dynamic-product-carousel.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    HeaderComponent,
    Partners,
    Footer,
    SocialButtonsComponent,
    LongMap,
    CategoriasDestacadasComponent,
    PlaxtiBannerComponent,
    FeatureNewProducts,
    CardContainerComponent,
    FullBanner,
    UtilGridProductoOther,
    NosotrosInicioComponent,
    BannerAsistenteComponent,
    CategoryProductsCarouselComponent,
    GrupoEmpresasComponent,
    BannerRegistroComponent,
    DynamicTestimoniosComponent,
    DynamicFaqComponent,
    DynamicGaleriaComponent,
    DynamicProductCarouselComponent
  ],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class Inicio implements OnInit {

  // Datos para el Banner Principal
  bannerImages: BannerImage[] = [
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767030291/ChatGPT_Image_Dec_29_2025_12_10_23_AM_msuluw.png',
      alt: 'Consultoría en Plaxtilineas',
      title: 'Asesoría Personalizada',
      description: 'Te ayudamos a elegir los mejores materiales para tus proyectos, con recomendaciones prácticas y útiles.',
      link: '/contacto',
      category: 'Asesoría'
    },
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768884810/envio3_qatfoe.jpg',
      alt: 'Entrega de productos Plaxtilineas',
      title: 'Llegamos hasta tu negocio',
      description: 'Te entregamos plásticos, espumas, mimbres, mallas y sogas justo cuando los necesitas.',
      link: '/contacto',
      category: 'Entrega'
    },
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767035505/banner1_qz3b3m.png',
      alt: 'Atención al cliente Plaxtilineas',
      title: 'Estamos aquí para ayudarte',
      description: 'Si tienes dudas sobre nuestros productos, estamos disponibles para orientarte.',
      link: '/contacto',
      category: 'Ayuda'
    },
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767030284/ChatGPT_Image_29_dic_2025_12_43_40_kcvskq.png',
      alt: 'Productos Plaxtilineas',
      title: 'Materiales de confianza',
      description: 'Plásticos, espumas, mimbres, mallas y sogas que necesitas para tu trabajo diario.',
      link: '/productos',
      category: 'Materiales'
    }
  ];

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