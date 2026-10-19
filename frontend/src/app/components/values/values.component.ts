import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Milestone {
  year: string;
  title: string;
  subtitle: string;
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
  hitos: Milestone[] = [
    {
      year: '2014',
      title: 'Fundación',
      subtitle: 'Distribución inicial de plásticos y películas en el Eje Cafetero.',
      image: 'assets/images/plasticos_tienda.png'
    },
    {
      year: '2016',
      title: 'Sede Cra. 19 (Armenia)',
      subtitle: 'Apertura de la sede principal en Armenia con corte a medida y stock permanente.',
      image: 'assets/images/plasticos_industriales_1.png'
    },
    {
      year: '2019',
      title: 'Espumas & Tapicería',
      subtitle: 'Espumas industriales certificadas en densidades D20 a D30.',
      image: 'assets/images/espumasenvivo.png'
    },
    {
      year: '2022',
      title: 'Mallas & Agro',
      subtitle: 'Polisombras, geomembranas y plásticos para el campo y obras.',
      image: 'assets/images/plasticos_malla.jpg'
    },
    {
      year: 'Hoy',
      title: 'Liderazgo Regional',
      subtitle: '+80 referencias de catálogo y despachos a todo el Eje Cafetero.',
      image: 'assets/images/plasticos_industriales_3.png'
    }
  ];
}