import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Milestone {
  year: string;
  title: string;
  subtitle: string;
  image: string;
  isLogo?: boolean;
}

@Component({
  selector: 'app-values',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './values.component.html',
  styleUrls: ['./values.component.css']
})
export class Values implements OnInit, AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  hitos: Milestone[] = [
    {
      year: '2014',
      title: 'Fundación',
      subtitle: 'Distribución inicial de plásticos y películas en el Eje Cafetero.',
      image: 'assets/images/plasticos_tienda.png',
      isLogo: false
    },
    {
      year: '2016',
      title: 'Sede Cra. 19 (Armenia)',
      subtitle: 'Apertura de la sede principal en Armenia con corte a medida y stock permanente.',
      image: 'assets/images/hero/hero-chatgpt.png',
      isLogo: false
    },
    {
      year: '2019',
      title: 'Espumas y Plásticos',
      subtitle: 'Espumas industriales certificadas en densidades D20 a D30 y materiales técnicos.',
      image: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792786746/logo-grande_y4mpxp.png',
      isLogo: true
    },
    {
      year: '2022',
      title: 'Mallas & Agro',
      subtitle: 'Polisombras, geomembranas y plásticos para el campo y obras.',
      image: 'assets/images/plasticos_malla.jpg',
      isLogo: false
    },
    {
      year: 'Hoy',
      title: 'Liderazgo Regional',
      subtitle: '+80 referencias de catálogo y despachos a todo el Eje Cafetero.',
      image: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png',
      isLogo: true
    }
  ];

  constructor(private el: ElementRef) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      });

      const items = this.el.nativeElement.querySelectorAll('.timeline-glass-item');
      items.forEach((item: Element) => this.observer?.observe(item));
    } else {
      // Fallback si IntersectionObserver no está disponible
      const items = this.el.nativeElement.querySelectorAll('.timeline-glass-item');
      items.forEach((item: Element) => item.classList.add('is-visible'));
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}