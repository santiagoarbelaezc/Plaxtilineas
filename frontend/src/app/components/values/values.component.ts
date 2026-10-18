import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Milestone {
  year: string;
  title: string;
  subtitle: string;
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
      title: 'Fundación',
      subtitle: 'Armenia, Quindío'
    },
    {
      year: '2010',
      title: 'Peletería & Espumas',
      subtitle: 'Densidades Certificadas'
    },
    {
      year: '2016',
      title: 'Línea Agro & Obras',
      subtitle: 'Polisombras y Construcción'
    },
    {
      year: '2021',
      title: 'Centro Logístico',
      subtitle: 'Sede Principal Cra. 19'
    },
    {
      year: 'Hoy',
      title: 'Liderazgo Regional',
      subtitle: '+80 Referencias Oficiales'
    }
  ];

  selectHito(index: number): void {
    this.activeHitoIndex = index;
  }
}