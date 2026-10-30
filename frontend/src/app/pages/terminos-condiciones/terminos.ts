import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, Footer],
  templateUrl: './terminos.html',
  styleUrls: ['./terminos.css']
})
export class Terminos implements OnInit {
  // Todas las secciones inician ocultas para navegación ágil
  seccionesAbiertas: { [key: string]: boolean } = {
    'identificacion': false,
    'precios': false,
    'cortes': false,
    'retracto': false,
    'garantias': false,
    'envios': false,
    'pqrs': false
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
    this.seccionesAbiertas[sectionId] = true;
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
