import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

interface Empresa {
  nombre: string;
  imagenBanner: string;
  url: string;
  colorTheme: string;
}

@Component({
  selector: 'app-grupo-empresas',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './grupo-empresas.component.html',
  styleUrls: ['./grupo-empresas.component.css']
})
export class GrupoEmpresasComponent {
  empresas: Empresa[] = [
    {
      nombre: 'Colchones Districol',
      imagenBanner: 'assets/images/grupoempresas/districol.png',
      url: 'https://colchonesdistricol.com/',
      colorTheme: '#2b4260',
    },
    {
      nombre: 'Espumas y Plásticos',
      imagenBanner: 'assets/images/grupoempresas/espumas.png',
      url: 'https://espumasyplasticos.com/',
      colorTheme: '#008ac7',
    },
    {
      nombre: 'Camascotas',
      imagenBanner: 'assets/images/grupoempresas/camascotas.png',
      url: 'https://camascotas.com/home',
      colorTheme: '#81C784',
    }
  ];

  constructor(library: FaIconLibrary) {
    library.addIcons(faExternalLinkAlt);
  }
}
