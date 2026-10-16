import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

export interface SolucionItem {
  id: string;
  url: string;
  alt: string;
  category: string;
  title: string;
  description: string;
  link: string;
  actionText: string;
}

@Component({
  selector: 'app-soluciones-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './soluciones-banner.component.html',
  styleUrls: ['./soluciones-banner.component.css']
})
export class SolucionesBannerComponent {
  activeIndex: number | null = null;

  soluciones: SolucionItem[] = [
    {
      id: 'mallas',
      url: 'assets/images/hero/home-chatgpt.png',
      alt: 'Mallas plásticas y polisombra Plaxtilineas',
      category: 'Mallas & Agro',
      title: 'Mallas y Polisombras',
      description: 'Mallas plásticas, polisombra al 65% y 80% con protección UV para fincas, cultivos y cerramientos de obra.',
      link: '/productos',
      actionText: 'Ver Productos'
    },
    {
      id: 'empaques',
      url: 'assets/images/hero/hero-chatgpt.png',
      alt: 'Plástico burbuja, vinipel stretch y empaques Plaxtilineas',
      category: 'Empaques & Envíos',
      title: 'Soluciones de Embalaje',
      description: 'Plástico burbuja, rollos de stretch film industrial y cartón corrugado para la protección integral de tus envíos.',
      link: '/productos',
      actionText: 'Ver Productos'
    },
    {
      id: 'ayuda',
      url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767035505/banner1_qz3b3m.png',
      alt: 'Estamos aquí para ayudarte - Asesoría Plaxtilineas',
      category: 'Atención & Asesoría',
      title: 'Estamos aquí para ayudarte',
      description: 'Asesoría técnica y personalizada para resolver cualquier duda y cotizar proyectos a la medida.',
      link: '/contacto',
      actionText: 'Hablar con Asesor'
    },
    {
      id: 'envios',
      url: 'assets/images/soluciones/Industrial Cargo Truck Overlooking the City.png',
      alt: 'Envíos a todo el Eje Cafetero - Plaxtilineas',
      category: 'Logística & Envíos',
      title: 'Envíos a todo el Eje Cafetero',
      description: 'Llegamos a tu finca, obra o negocio en Armenia, Pereira, Manizales y alrededores con entregas rápidas y seguras.',
      link: '/contacto',
      actionText: 'Cotizar Despacho'
    }
  ];

  constructor(private router: Router) {}

  onCardHover(index: number): void {
    this.activeIndex = index;
  }

  onCardLeave(): void {
    this.activeIndex = null;
  }

  onCardClick(item: SolucionItem): void {
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }
}
