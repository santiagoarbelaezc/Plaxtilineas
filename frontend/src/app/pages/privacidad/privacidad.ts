import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';

@Component({
  selector: 'app-privacidad',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, Footer],
  templateUrl: './privacidad.html',
  styleUrls: ['./privacidad.css']
})
export class Privacidad implements OnInit {
  fechaActualizacion: string = 'Octubre 2026';
  nombreEmpresa: string = 'PLAXTILINEAS S.A.S.';
  emailContacto: string = 'plaxtilineas.sas@gmail.com';
  emailPrivacidad: string = 'privacidad@plaxtilineas.com';
  telefonoContacto: string = '+57 310 542 3854';
  direccionFisica: string = 'Cra. 19 # 19 - 35, Armenia, Quindío';

  // Todas las secciones inician ocultas conforme a la solicitud del usuario
  seccionesAbiertas: { [key: string]: boolean } = {
    'responsable': false,
    'datos-recopilados': false,
    'finalidades': false,
    'derechos-arco': false,
    'cookies': false,
    'seguridad': false,
    'canales-arco': false
  };

  constructor() { }

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleSeccion(seccionId: string): void {
    this.seccionesAbiertas[seccionId] = !this.seccionesAbiertas[seccionId];
  }

  estaAbierta(seccionId: string): boolean {
    return !!this.seccionesAbiertas[seccionId];
  }

  abrirTodas(): void {
    Object.keys(this.seccionesAbiertas).forEach(key => {
      this.seccionesAbiertas[key] = true;
    });
  }

  cerrarTodas(): void {
    Object.keys(this.seccionesAbiertas).forEach(key => {
      this.seccionesAbiertas[key] = false;
    });
  }

  contarAbiertas(): number {
    return Object.values(this.seccionesAbiertas).filter(Boolean).length;
  }

  irASeccion(sectionId: string): void {
    // Si está cerrada, la abrimos para que el usuario vea el contenido desplegado
    this.seccionesAbiertas[sectionId] = true;

    // Desplazamiento suave con compensación de barra fija
    setTimeout(() => {
      this.scrollTo(sectionId);
    }, 60);
  }

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 130;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - navOffset,
        behavior: 'smooth'
      });
    }
  }
}
