import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header-enlaces',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header-enlaces.component.html',
  styleUrls: ['./header-enlaces.component.css']
})
export class HeaderEnlacesComponent {
  currentSlide = 0;

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  items = [
    {
      img: 'assets/images/plasticos_tienda.png',
      title: 'Espumas y Confort',
      subtitle: 'Espumas cortadas a medida, yumbolón y aislamiento térmico-acústico de excelente calidad.',
      link: '/productos'
    },
    {
      img: 'assets/images/plasticos_costura.png',
      title: 'Plásticos Industriales',
      subtitle: 'Pisos vinílicos, mallas, tanques y soluciones plásticas de alta resistencia para tu industria.',
      link: '/productos'
    },
    {
      img: 'assets/images/plasticos_malla.jpg',
      title: 'Empaques y Embalajes',
      subtitle: 'Bolsas de alta densidad, burbuja protectora y plásticos termoencogibles a tu medida.',
      link: '/productos'
    }
  ];

  onScroll(event: Event) {
    const element = event.target as HTMLElement;
    const scrollLeft = element.scrollLeft;
    const width = element.clientWidth;
    if (width > 0) {
      this.currentSlide = Math.round(scrollLeft / width);
    }
  }

  scrollToSlide(index: number) {
    const container = this.scrollContainer.nativeElement;
    const width = container.clientWidth;
    container.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
    this.currentSlide = index;
  }
}
