// description-producto.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import { Footer } from '../footer/footer.component';
import { SocialButtonsComponent } from '../social-buttons/social-buttons.component';
import { CarouselInteres } from './carousel-interes/carousel-interes';
import { CarouselRelacionados } from './carousel-relacionados/carousel-relacionados';
import { DescriptionProductoSelect } from './description-producto-select/description-producto-select';

@Component({
  selector: 'app-description-producto',
  standalone: true,
  imports: [CommonModule, NavbarComponent, Footer, SocialButtonsComponent, CarouselInteres, DescriptionProductoSelect, CarouselRelacionados],
  templateUrl: './description-producto.html',
  styleUrl: './description-producto.css'
})
export class DescriptionProducto {
  // Esto cambiará cada vez que se recargue el componente
  timestamp = Date.now();
  
  // Opcional: método para forzar recarga manualmente
  recargarCarousel() {
    this.timestamp = Date.now();
  }
}