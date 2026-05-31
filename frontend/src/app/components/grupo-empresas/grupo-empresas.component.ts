import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

interface Empresa {
  nombre: string;
  logo: string;
  imagenEnvivo: string;
  url: string;
  colorTheme: string;
  descripcion: string;
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
      logo: 'assets/icons/logo-distri.png',
      imagenEnvivo: 'assets/images/districolenvivo.png',
      url: 'https://colchonesdistricol.com/',
      colorTheme: '#2b4260',
      descripcion: 'Líderes en descanso y confort. Descubre nuestra amplia gama de colchones, bases y accesorios de descanso diseñados para tu bienestar.'
    },
    {
      nombre: 'Espumas y Plásticos',
      logo: 'assets/icons/espumas.png',
      imagenEnvivo: 'assets/images/espumasenvivo.png',
      url: 'https://espumasyplasticos.com/',
      colorTheme: '#008ac7',
      descripcion: 'Especialistas en espumas industriales, bloques de poliuretano y soluciones plásticas de alta densidad para la industria y el hogar.'
    },
    {
      nombre: 'Camascotas',
      logo: 'assets/icons/logo.png',
      imagenEnvivo: 'assets/images/camascotasenvivo.png',
      url: 'https://camascotas.com/home',
      colorTheme: '#81C784', // Verde claro
      descripcion: 'Amor y comodidad para tus mejores amigos. Camas y colchonetas ergonómicas diseñadas para el descanso y felicidad de tus mascotas.'
    }
  ];

  constructor(library: FaIconLibrary) {
    library.addIcons(faExternalLinkAlt);
  }
}
