import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Milestone {
  year: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  image: string;
}

@Component({
  selector: 'app-values',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './values.component.html',
  styleUrls: ['./values.component.css']
})
export class Values {
  activeHitoIndex: number = 0;
  hoveredHitoIndex: number | null = null;

  hitos: Milestone[] = [
    {
      year: '2004',
      title: 'Fundación & Raíces Comerciales',
      subtitle: 'Comienzo de operaciones en el centro de Armenia con distribución de películas plásticas, telas plastificadas y cubiertas.',
      category: 'Plásticos & Películas',
      badge: 'Origen Plaxtilineas',
      image: 'assets/images/plasticos_tienda.png'
    },
    {
      year: '2010',
      title: 'Peletería & Espumas Industriales',
      subtitle: 'Distribución autorizada de espumas certificadas en densidades D20 a D30, láminas de tapicería y corte especializado.',
      category: 'Espumas & Tapicería',
      badge: 'Densidad Certificada',
      image: 'assets/images/espumasenvivo.png'
    },
    {
      year: '2016',
      title: 'Línea Agroindustrial & Construcción',
      subtitle: 'Ampliación con polisombras 65%-80%, mallas agrícolas antipájaros, geomembranas y plásticos para invernaderos.',
      category: 'Mallas & Agro',
      badge: 'Protección Agrícola',
      image: 'assets/images/plasticos_malla.jpg'
    },
    {
      year: '2021',
      title: 'Sede Principal Cra. 19 & Gran Formato',
      subtitle: 'Apertura de la sede actual con corte al milímetro, inventario en rollo industrial y logística de despacho regional.',
      category: 'Corte a Medida',
      badge: 'Cra. 19 # 19-35 Armenia',
      image: 'assets/images/plasticos_industriales_1.png'
    },
    {
      year: 'Hoy',
      title: 'Catálogo Integral & Despacho Regional',
      subtitle: 'Más de 80 referencias oficiales: geosintéticos, empaques, vinilos técnicos y despachos inmediatos a todo el Eje Cafetero.',
      category: 'Catálogo 360°',
      badge: 'Despacho Inmediato',
      image: 'assets/images/plasticos_industriales_3.png'
    }
  ];

  selectHito(index: number): void {
    this.activeHitoIndex = index;
  }
}