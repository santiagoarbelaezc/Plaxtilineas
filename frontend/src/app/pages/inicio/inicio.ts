import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
import { DynamicBackgroundComponent } from '../dynamic-background/dynamic-background';



@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    HeaderComponent,
    DynamicBackgroundComponent
  ],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class Inicio {
  // Datos para el Banner Principal
  bannerImages: BannerImage[] = [
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766986206/ChatGPT_Image_Dec_29_2025_12_10_23_AM_t70fov.png',
      alt: 'Consultoría especializada en plaxtilineas',
      title: 'Expertos en Soluciones',
      description: 'Brindamos asesoramiento personalizado para optimizar tus procesos industriales.',
      link: '/servicios/consultoria',
      category: 'Consultoría'
    },
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766986204/ChatGPT_Image_Dec_29_2025_12_17_49_AM_obxcaa.png',
      alt: 'Distribución eficiente de productos',
      title: 'Distribución Confiable',
      description: 'Logística optimizada con entregas puntuales a nivel nacional e internacional.',
      link: '/servicios/distribucion',
      category: 'Distribución'
    },
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766986205/ChatGPT_Image_Dec_29_2025_12_15_58_AM_g7uow9.png',
      alt: 'Soporte técnico permanente',
      title: 'Soporte 24/7',
      description: 'Asistencia técnica especializada disponible cuando más lo necesitas.',
      link: '/servicios/soporte',
      category: 'Soporte'
    },
    {
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766979719/ChatGPT_Image_Dec_28_2025_08_26_03_PM_wjgmcg.png',
      alt: 'Productos de calidad plaxtilineas',
      title: 'Calidad Certificada',
      description: 'Insumos esenciales con los más altos estándares de calidad industrial.',
      link: '/productos',
      category: 'Productos'
    }
  ];

  // Datos para el componente Trio Presentation - Valores
  valoresCards: ContentCard[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Calidad certificada',
      title: 'Excelencia en Calidad',
      description: 'Compromiso con los más altos estándares en todos nuestros productos y servicios.',
      link: '/calidad',
      textPosition: 'bottom'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Innovación constante',
      title: 'Innovación Continua',
      description: 'Buscamos constantemente nuevas soluciones para mejorar procesos y resultados.',
      link: '/innovacion',
      textPosition: 'center'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Compromiso con el cliente',
      title: 'Compromiso Total',
      description: 'Dedicación absoluta a satisfacer y superar las expectativas de nuestros clientes.',
      link: '/compromiso',
      textPosition: 'top'
    }
  ];

  // Datos para el componente Trio Presentation - Servicios
  serviciosCards: ContentCard[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Venta de insumos industriales',
      title: 'Venta de Insumos',
      description: 'Amplio catálogo de productos esenciales para la industria con calidad garantizada.',
      link: '/productos/insumos',
      textPosition: 'bottom'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Distribución logística',
      title: 'Logística y Distribución',
      description: 'Servicio de distribución eficiente y puntual a lo largo de todo el territorio nacional.',
      link: '/servicios/logistica',
      textPosition: 'center'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Asesoramiento técnico',
      title: 'Asesoría Técnica',
      description: 'Expertos disponibles para brindar soluciones personalizadas a tus necesidades.',
      link: '/servicios/asesoria',
      textPosition: 'top'
    }
  ];

  // Datos para una tercera sección opcional - Sectores
  sectoresCards: ContentCard[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Industria manufacturera',
      title: 'Manufactura',
      description: 'Soluciones para el sector manufacturero con productos de alta precisión y durabilidad.',
      link: '/sectores/manufactura',
      textPosition: 'bottom'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Industria de la construcción',
      title: 'Construcción',
      description: 'Materiales y herramientas especializadas para el sector de la construcción.',
      link: '/sectores/construccion',
      textPosition: 'center'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      altText: 'Industria automotriz',
      title: 'Automotriz',
      description: 'Componentes y suministros para la industria automotriz con estándares internacionales.',
      link: '/sectores/automotriz',
      textPosition: 'top'
    }
  ];
}