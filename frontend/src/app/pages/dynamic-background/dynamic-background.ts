import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importa tus componentes
import { Partners } from '../../components/partners/partners.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from '../../components/social-buttons/social-buttons.component';

import { CategoriasDestacadasComponent } from '../../components/categorias-destacadas/categorias-destacadas.component';
import { FeatureBanner } from '../../components/feature-banner/feature-banner';
import { PlaxtiTrioPresentationComponent } from '../../components/trio-presentation/trio-presentation';
import { PlaxtiBannerComponent } from '../../components/banner/banner';

import { ContentCard } from '../../models/content-card.model';
import { BannerImage } from '../../components/banner/banner';
import { FeatureNewProducts } from '../../components/feature-new-products/feature-new-products';
import { Card } from '../../components/card/card';
import { CarouselComponent } from '../../components/carousel/carousel';
import { CardBannerComponent } from '../../components/card-banner/card-banner';
import { CardContainerComponent } from '../../components/card-container/card-container';
import { CardPromos } from '../../components/card-promos/card-promos';
import { FullBanner } from '../../components/full-banner/full-banner';
import { LongMap} from '../../components/long-map/long-map.component';
import { UtilGridProducto } from '../../components/grid-producto/util-grid-producto/util-grid-producto';
import { UtilGridProductoOther } from "../../components/grid-producto/util-grid-producto-other/util-grid-producto-other";


@Component({
  selector: 'app-dynamic-background',
  standalone: true,
  imports: [
    CommonModule,
    Partners,
    Footer,
    SocialButtonsComponent,
    LongMap,
    CategoriasDestacadasComponent,
    PlaxtiTrioPresentationComponent,
    PlaxtiBannerComponent,
    FeatureNewProducts,
    CardContainerComponent,
    FullBanner,
    UtilGridProducto,
    UtilGridProductoOther
],
  templateUrl: './dynamic-background.html',
  styleUrls: ['./dynamic-background.css']
})
export class DynamicBackgroundComponent implements OnInit {
  
  // Datos actualizados con texto más modesto y amigable
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

  constructor() { }

  ngOnInit(): void {
    // Establecer el fondo blanco por defecto
    this.setWhiteBackground();
  }

  private setWhiteBackground(): void {
    // Establecer el fondo blanco en el body o en el componente principal
    document.body.style.backgroundColor = '#FFFFFF';
    document.documentElement.style.backgroundColor = '#FFFFFF';
  }
}