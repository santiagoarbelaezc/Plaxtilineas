import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';

export interface GrupoBrand {
  id: string;
  name: string;
  tag: string;
  heroImage: string;
  logo: string;
  description: string;
  websiteUrl: string;
  accentColor: string;
}

@Component({
  selector: 'app-grupo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    Footer,
    SocialButtonsComponent
  ],
  templateUrl: './grupo.html',
  styleUrls: ['./grupo.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Grupo implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('carouselTrack', { static: false }) carouselTrack?: ElementRef<HTMLElement>;

  private cdr = inject(ChangeDetectorRef);

  public activeIndex: number = 0;
  public isPaused: boolean = false;
  private autoPlayTimer: any = null;
  private touchStartX: number = 0;
  private isWheelCooldown: boolean = false;

  // Las 3 marcas del Grupo con sus imágenes oficiales panorámicas y logos PNG
  public readonly brands: GrupoBrand[] = [
    {
      id: 'camascotas',
      name: 'Camascotas',
      tag: 'LÍNEA PET CARE & DESCANSO ANIMAL',
      heroImage: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1786973369/proyecto-camascotas_qcmstp.png',
      logo: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796946/logo2_hrboyb.png',
      description: 'Camas ortopédicas, colchonetas impermeables y accesorios diseñados con amor para el descanso y salud de tus mascotas.',
      websiteUrl: 'https://camascotas.com/',
      accentColor: '#16a34a'
    },
    {
      id: 'districol',
      name: 'Colchones Districol',
      tag: 'CONFORT & DESCANSO ORTOPÉDICO',
      heroImage: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796364/Districol_Mattress_Brand_Hero_Scene_z6577x.png',
      logo: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796538/logo-distri_ri8lkq.png',
      description: 'Línea de descanso ortopédico y anatómico diseñada con espumas de alta resiliencia para una postura óptima y bienestar.',
      websiteUrl: 'https://colchonesdistricol.com/',
      accentColor: '#16a34a'
    },
    {
      id: 'espumas',
      name: 'Espumas y Plásticos',
      tag: 'MATERIA PRIMA & CORTE INDUSTRIAL',
      heroImage: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792796374/Espumas_y_Pl%C3%A1sticos__Confort_Moderno_pu3seo.png',
      logo: 'https://res.cloudinary.com/doxdjiyvi/image/upload/v1792788733/logo-grande_qauprn.png',
      description: 'Transformación, corte exacto y distribución de espumas industriales en densidades D20 a D30, plásticos técnicos y bobinas.',
      websiteUrl: 'https://espumasyplasticos.com/',
      accentColor: '#000000'
    }
  ];

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#FFFFFF';
      document.documentElement.style.backgroundColor = '#FFFFFF';
    }
    this.startAutoPlay();
  }

  ngAfterViewInit(): void {
    const track = this.carouselTrack?.nativeElement;
    if (track) {
      // Registrar evento de rueda de mouse con passive: false para permitir navegación horizontal
      track.addEventListener('wheel', this.handleWheel, { passive: false });
    }
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    const track = this.carouselTrack?.nativeElement;
    if (track) {
      track.removeEventListener('wheel', this.handleWheel);
    }
  }

  public selectBrand(index: number): void {
    this.activeIndex = index;
    const track = this.carouselTrack?.nativeElement;
    if (track) {
      track.scrollTo({
        left: index * track.clientWidth,
        behavior: 'smooth'
      });
    }
    this.restartAutoPlay();
    this.cdr.markForCheck();
  }

  public prevSlide(): void {
    const newIndex = (this.activeIndex - 1 + this.brands.length) % this.brands.length;
    this.selectBrand(newIndex);
  }

  public nextSlide(): void {
    const newIndex = (this.activeIndex + 1) % this.brands.length;
    this.selectBrand(newIndex);
  }

  /**
   * Detecta el scroll horizontal nativo (cuando el usuario usa trackpad o rueda de mouse)
   * y actualiza el índice activo en la barra minimalista superior
   */
  public onTrackScroll(): void {
    const track = this.carouselTrack?.nativeElement;
    if (!track || track.clientWidth === 0) return;

    const currentIdx = Math.round(track.scrollLeft / track.clientWidth);
    if (currentIdx !== this.activeIndex && currentIdx >= 0 && currentIdx < this.brands.length) {
      this.activeIndex = currentIdx;
      this.cdr.markForCheck();
    }
  }

  /**
   * Redirige al sitio web oficial de la marca al hacer clic en cualquier parte de la diapositiva
   */
  public openBrandSite(url: string, event?: MouseEvent): void {
    if (event) {
      // Evitar que el clic en un enlace interior dispare dos veces la navegación
      const target = event.target as HTMLElement;
      if (target.closest('button')) {
        return;
      }
    }
    if (typeof window !== 'undefined' && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Manejador de la rueda de mouse: SOLO se activa si el usuario hace scroll horizontal (hacia los lados).
   * El scroll vertical normal del mouse NO mueve el carrusel y permite scrollear la página libremente.
   */
  private handleWheel = (event: WheelEvent): void => {
    const track = this.carouselTrack?.nativeElement;
    if (!track) return;

    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);

    // Si el movimiento es vertical (scroll normal arriba/abajo), permitimos el scroll natural de la página
    if (absY >= absX) {
      return;
    }

    // Únicamente si el usuario se desplaza explícitamente hacia los lados (horizontal)
    if (absX > 16) {
      event.preventDefault();
      if (this.isWheelCooldown) return;
      this.isWheelCooldown = true;

      if (event.deltaX > 0) {
        // Al mover hacia la derecha: si está en la última pasa a la primera
        this.nextSlide();
      } else {
        // Al mover hacia la izquierda: si está en la primera pasa a la última
        this.prevSlide();
      }

      setTimeout(() => {
        this.isWheelCooldown = false;
      }, 400);
    }
  };

  public onMouseEnter(): void {
    this.isPaused = true;
    this.stopAutoPlay();
  }

  public onMouseLeave(): void {
    this.isPaused = false;
    this.startAutoPlay();
  }

  public onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  public onTouchEnd(event: TouchEvent): void {
    const touchEndX = event.changedTouches[0].clientX;
    const deltaX = touchEndX - this.touchStartX;
    if (Math.abs(deltaX) > 45) {
      if (deltaX > 0) {
        this.prevSlide();
      } else {
        this.nextSlide();
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  public handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      this.prevSlide();
    } else if (event.key === 'ArrowRight') {
      this.nextSlide();
    }
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.autoPlayTimer = setInterval(() => {
      if (!this.isPaused) {
        this.nextSlide();
      }
    }, 7000);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  private restartAutoPlay(): void {
    this.stopAutoPlay();
    if (!this.isPaused) {
      this.startAutoPlay();
    }
  }
}
