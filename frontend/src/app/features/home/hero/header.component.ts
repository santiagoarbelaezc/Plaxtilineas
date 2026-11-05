import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faShoppingCart,
  faUsers,
  faEnvelope,
  faRobot,
  faArrowRight,
  faShieldAlt,
  faTruck,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';

export interface HeroSlide {
  id: string;
  categoryTag?: string;
  titleLead: string;
  titleHighlight: string;
  pillLabel?: string;
  description: string;
  image: string;
  altText: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, FontAwesomeModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  public mostrarHeader = true;
  public authService = inject(AuthService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  // Slides del Hero Carrusel
  public slides: HeroSlide[] = [
    {
      id: 'construccion',
      categoryTag: 'LÍNEA ESTRUCTURAL & INFRAESTRUCTURA',
      titleLead: 'MATERIALES PARA',
      titleHighlight: 'CONSTRUCCIÓN',
      pillLabel: 'CONSTRUCCIÓN',
      description: 'Polietilenos de alta resistencia, geomembranas y láminas de protección diseñadas para resistir las condiciones más exigentes en obra.',
      image: 'assets/images/hero/slides/construccion.jpg',
      altText: 'Obra de construcción con materiales plásticos y polietileno'
    },
    {
      id: 'agricultura',
      categoryTag: 'TECNIFICACIÓN AGRÍCOLA & RIEGO',
      titleLead: 'PLÁSTICOS Y RIEGO PARA',
      titleHighlight: 'AGRICULTURA',
      pillLabel: 'AGRICULTURA',
      description: 'Agropolietileno con filtro UV para invernaderos, acolchado plástico y sistemas de riego para maximizar el rendimiento de tus cosechas.',
      image: 'assets/images/hero/slides/agricultura.jpg',
      altText: 'Invernadero túnel tecnificado con películas plásticas y acolchado'
    },
    {
      id: 'tapiceria',
      categoryTag: 'TAPICERÍA AUTOMOTRIZ & HOGAR',
      titleLead: 'MATERIALES PARA',
      titleHighlight: 'TAPICERÍA',
      pillLabel: 'TAPICERÍA',
      description: 'Cuerinas microperforadas, vinilos náuticos de alta durabilidad y pisos antideslizantes para acabados elegantes y resistentes.',
      image: 'assets/images/hero/slides/tapiceria.jpg',
      altText: 'Taller de tapicería automotriz con cuerinas y materiales de diseño'
    },
    {
      id: 'espumas',
      categoryTag: 'CONFORT & AISLAMIENTO TÉCNICO',
      titleLead: 'SOLUCIONES EN',
      titleHighlight: 'ESPUMAS',
      pillLabel: 'ESPUMAS',
      description: 'Espumas de poliuretano de alta densidad, láminas troqueladas acústicas y Jumbolon para colchonería, muebles y embalaje.',
      image: 'assets/images/hero/slides/espumas.jpg',
      altText: 'Fábrica de espumas de poliuretano y láminas de alta densidad'
    },
    {
      id: 'plasticos',
      categoryTag: 'EMBALAJE & PROTECCIÓN INDUSTRIAL',
      titleLead: 'SOLUCIONES EN',
      titleHighlight: 'PLÁSTICOS Y EMPAQUE',
      pillLabel: 'PLÁSTICOS',
      description: 'Bobinas de vinipel stretch film, plástico burbuja y soluciones integrales de embalaje para la protección segura de tu mercancía.',
      image: 'assets/images/hero/slides/plasticos.jpg',
      altText: 'Almacén logístico con bobinas de vinipel stretch film y plástico burbuja'
    }
  ];

  public currentSlideIndex = 0;
  public slideTransitioning = false;
  public isPaused = false;
  private autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private readonly SLIDE_DURATION_MS = 6500;

  constructor(library: FaIconLibrary) {
    library.addIcons(
      faShoppingCart,
      faUsers,
      faEnvelope,
      faRobot,
      faArrowRight,
      faShieldAlt,
      faTruck,
      faChevronLeft,
      faChevronRight
    );

    this.router.events.subscribe(() => {
      this.mostrarHeader = !['/login', '/admin'].includes(this.router.url);
    });
  }

  public ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoplay();
    }
  }

  public ngOnDestroy(): void {
    this.stopAutoplay();
  }

  public get currentSlide(): HeroSlide {
    return this.slides[this.currentSlideIndex] || this.slides[0];
  }

  public nextSlide(): void {
    const nextIndex = (this.currentSlideIndex + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }

  public prevSlide(): void {
    const prevIndex = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prevIndex);
  }

  public goToSlide(index: number): void {
    if (index === this.currentSlideIndex || index < 0 || index >= this.slides.length) {
      return;
    }

    this.slideTransitioning = true;
    this.currentSlideIndex = index;
    this.cdr.markForCheck();

    if (isPlatformBrowser(this.platformId)) {
      this.startAutoplay();
    }

    setTimeout(() => {
      this.slideTransitioning = false;
      this.cdr.markForCheck();
    }, 450);
  }

  public pauseAutoplay(): void {
    this.isPaused = true;
    this.stopAutoplay();
  }

  public resumeAutoplay(): void {
    this.isPaused = false;
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoplay();
    }
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      if (!this.isPaused) {
        this.nextSlide();
      }
    }, this.SLIDE_DURATION_MS);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  public abrirAsistente(): void {
    this.chatService.toggleChat();
  }

  public goToRegister(): void {
    this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }
}
