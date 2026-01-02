import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CarouselComponent } from '../carousel/carousel';
import { CardBannerComponent } from '../card-banner/card-banner';
import { Card} from '../card/card';
import { CardPromos } from '../card-promos/card-promos';

@Component({
  selector: 'app-card-container',
  standalone: true,
  imports: [
    CommonModule, 
    Card, 
    CarouselComponent, 
    CardBannerComponent,
    CardPromos // Añade el componente de promos
  ],
  templateUrl: './card-container.html',
  styleUrls: ['./card-container.css']
})
export class CardContainerComponent {
  // Inputs para el componente Card
  @Input() precio: string = '';
  @Input() nombreProducto: string = '';
  @Input() imagenProducto: string = '';
  
  // Inputs para el componente Carousel
  @Input() categoriaNombre: string = '';
  
  // Inputs para el componente CardBanner
  @Input() bannerImagenUrl: string = '';
  @Input() bannerTitulo: string = '';
  @Input() bannerDescripcion: string = '';
  @Input() bannerAltText: string = '';
  
  // Inputs para el componente CardPromos
  @Input() promoTitulo: string = 'ENVIOS A PARTIR DE $ 70.000';
  @Input() promoDescripcion: string = 'Compra y nosotros te lo enviamos a tu casa';
  @Input() promoImagen: string = 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767305113/envio4_vgotab.jpg';
  @Input() promoLogoUrl: string = 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767224962/logo-peque%C3%B1o_mrokec.png';
  
  // Inputs para personalización del layout
  @Input() cardWidth: string = '300px';
  @Input() carouselHeight: string = 'auto';
  @Input() bannerHeight: string = '300px';
  @Input() gap: string = '20px';
}