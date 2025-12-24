import { Component, OnInit, AfterViewInit, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { AosService } from '../../services/aos.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  encapsulation: ViewEncapsulation.None  // ⚠️ AGREGAR ESTA LÍNEA
})
export class NavbarComponent implements OnInit, AfterViewInit {
  menuAbierto = false;
  private activeLinkIndex = 0;
  private linkPositions: number[] = [];

  constructor(
    library: FaIconLibrary,
    private aosService: AosService
  ) {
    library.addIcons(faKey);
  }

  ngOnInit(): void {
    this.calculateLinkPositions();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.aosService.refresh();
    }, 100);
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
    if (this.menuAbierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  closeMenu(): void {
    this.menuAbierto = false;
    document.body.style.overflow = 'auto';
    setTimeout(() => {
      this.aosService.refresh();
    }, 300);
  }

  private calculateLinkPositions(): void {
    this.linkPositions = [0, 80, 160, 240, 320];
  }

  onLinkClick(index: number): void {
    this.activeLinkIndex = index;
    this.closeMenu(); // Cierra el menú al hacer clic
  }

  @HostListener('window:resize')
  onResize(): void {
    this.calculateLinkPositions();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.updateActiveLinkBasedOnScroll();
  }

  private updateActiveLinkBasedOnScroll(): void {
    const sections = ['inicio', 'productos', 'nosotros', 'contacto'];
    const scrollPosition = window.scrollY + 100;
    
    for (let i = sections.length - 1; i >= 0; i--) {
      const element = document.getElementById(sections[i]);
      if (element && element.offsetTop <= scrollPosition) {
        this.activeLinkIndex = i;
        break;
      }
    }
  }
}