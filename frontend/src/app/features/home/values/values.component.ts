import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faClock,
  faUsers,
  faLightbulb,
  faHandshake,
  faGraduationCap
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-values',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './values.component.html',
  styleUrls: ['./values.component.css']
})
export class Values implements OnInit, AfterViewInit {
  
  private isBrowser: boolean;

  constructor(
    library: FaIconLibrary,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Añadir los íconos a la librería
    library.addIcons(
      faClock, 
      faUsers, 
      faLightbulb, 
      faHandshake, 
      faGraduationCap
    );
  }

  ngOnInit() {
    console.log('✅ Componente Values inicializado');
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // Inicializar animaciones simples si es necesario
      this.initSimpleAnimations();
    }
  }

  private initSimpleAnimations(): void {
    // Animaciones básicas que se pueden hacer con CSS puro
    // El componente AOS se encargará de las animaciones al hacer scroll
    
    console.log('🔍 Animaciones simples inicializadas');
    
    // Solo para debug - puedes eliminar esto
    const cards = document.querySelectorAll('.valor-card');
    cards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => {
        card.classList.add('hover-active');
      });
      
      card.addEventListener('mouseleave', () => {
        card.classList.remove('hover-active');
      });
    });
  }
}