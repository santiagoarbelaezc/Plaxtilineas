import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface ProductFeatureBullet {
  title: string;
  desc: string;
}

export interface ProductFeatureItem {
  id?: string;
  kicker: string;
  titleLead: string;
  titleHighlight: string;
  description: string;
  bullets?: ProductFeatureBullet[];
  imageUrl: string;
  imageAlt: string;
  linkUrl: string;
  linkText: string;
  imagePosition?: 'left' | 'right';
}

@Component({
  selector: 'app-product-feature-split',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-feature-split.component.html',
  styleUrls: ['./product-feature-split.component.css']
})
export class ProductFeatureSplitComponent {
  /**
   * Permite pasar un único producto o una lista de productos.
   * Si no se especifica ninguno, utiliza por defecto Mallas y Yumbolón.
   */
  @Input() feature?: ProductFeatureItem;
  @Input() imagePosition?: 'left' | 'right';
  @Input() items?: ProductFeatureItem[];

  defaultItems: ProductFeatureItem[] = [
    {
      id: 'malla',
      kicker: 'LÍNEA AGRO & CONSTRUCCIÓN',
      titleLead: 'Mallas y Polisombras',
      titleHighlight: 'Protección UV y Clima',
      description: 'Mallas tejidas en polietileno de alta densidad con aditivos anti-UV. Diseñadas para control térmico, sombra en cultivos y cerramientos perimetrales de obra.',
      bullets: [
        { title: 'Control Solar', desc: 'Porcentajes de sombra del 35% al 80% para café, hortalizas y viveros.' },
        { title: 'Obras Civiles', desc: 'Cerramientos perimetrales limpios para retención de polvo y escombros.' },
        { title: 'Durabilidad', desc: 'Resistentes a vientos fuertes, lluvia ácida y radiación continua.' }
      ],
      imageUrl: 'assets/images/plasticos_malla.jpg',
      imageAlt: 'Rollos de mallas y polisombras Plaxtilineas',
      linkUrl: '/productos',
      linkText: 'VER MALLAS & POLISOMBRAS',
      imagePosition: 'left'
    },
    {
      id: 'yumbolon',
      kicker: 'AISLAMIENTO TÉRMICO & ACÚSTICO',
      titleLead: 'Yumbolón Bajo Techo',
      titleHighlight: 'Con Foil de Aluminio',
      description: 'Espuma de polietileno de celda cerrada con lámina reflectiva de aluminio. La barrera ideal para reducir drásticamente el calor y el ruido bajo cubiertas.',
      bullets: [
        { title: 'Reducción Térmica', desc: 'Baja entre 6°C y 8°C la temperatura interior bajo tejas de zinc o fibrocemento.' },
        { title: 'Amortiguación Acústica', desc: 'Atenúa notablemente el ruido del granizo y aguaceros sobre el tejado.' },
        { title: 'Barrera Impermeable', desc: 'Evita el goteo por condensación y protege estructuras metálicas.' }
      ],
      imageUrl: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446215/yumbo-img_cq954s.jpg',
      imageAlt: 'Rollos de Yumbolon con aluminio térmico Plaxtilineas',
      linkUrl: '/productos',
      linkText: 'VER YUMBOLÓN & AISLANTES',
      imagePosition: 'right'
    }
  ];

  get renderItems(): ProductFeatureItem[] {
    if (this.items && this.items.length > 0) {
      return this.items;
    }
    if (this.feature) {
      return [{
        ...this.feature,
        imagePosition: this.imagePosition || this.feature.imagePosition || 'left'
      }];
    }
    return this.defaultItems;
  }
}
