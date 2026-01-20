import { Component, OnInit, AfterViewInit, HostListener, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faKey, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { AosService } from '../../services/aos.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil, Subject } from 'rxjs';
import { SearchStateService } from '../../services/search-state.service';
import { MenuDropdown } from './menu-dropdown/menu-dropdown';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule, MenuDropdown],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  menuAbierto = false;
  private activeLinkIndex = 0;
  private linkPositions: number[] = [];
  
  // Variables para el buscador
  searchQuery: string = '';
  showSuggestions: boolean = false;
  isSearchRoute: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    library: FaIconLibrary,
    private aosService: AosService,
    private router: Router,
    private searchStateService: SearchStateService
  ) {
    library.addIcons(faKey, faSearch, faTimes);
  }

  ngOnInit(): void {
    this.calculateLinkPositions();
    this.setupRouterListener();
    this.setupSearchStateListener();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.aosService.refresh();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRouterListener(): void {
    // Escuchar cambios en la ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.isSearchRoute = event.url.includes('/busqueda');
      
      // Si estamos en la ruta de búsqueda, extraer el término de búsqueda
      if (this.isSearchRoute) {
        const urlParams = new URLSearchParams(event.url.split('?')[1]);
        const searchTerm = urlParams.get('q');
        if (searchTerm) {
          this.searchQuery = searchTerm;
          // Sincronizar con el servicio
          this.searchStateService.setSearchTerm(searchTerm);
        }
      } else {
        // Si salimos de la ruta de búsqueda, limpiar el campo
        this.searchQuery = '';
        this.searchStateService.clearSearch();
      }
    });
  }

  private setupSearchStateListener(): void {
    // Escuchar cambios en el término de búsqueda desde otros componentes
    this.searchStateService.searchTerm$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(term => {
      // Solo actualizar si es diferente al valor actual
      if (term !== this.searchQuery && term !== null && term !== undefined) {
        this.searchQuery = term;
      }
    });
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
    this.closeMenu();
  }

  // Métodos para el buscador
  onSearch(): void {
    const trimmedQuery = this.searchQuery.trim();
    if (trimmedQuery) {
      // Notificar al servicio que se está realizando una búsqueda
      this.searchStateService.triggerSearchFromNavbar(trimmedQuery);
      
      // Navegar a la página de búsqueda con el término
      this.router.navigate(['/busqueda'], {
        queryParams: { q: trimmedQuery },
        replaceUrl: true
      }).then(() => {
        this.showSuggestions = false;
      }).catch(error => {
        console.error('Error al navegar a búsqueda:', error);
      });
    }
  }

  // Método para manejar Enter en el input
  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSearch();
    }
  }

  onSearchFocus(): void {
    this.showSuggestions = true;
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.showSuggestions = false;
    this.searchStateService.clearSearch();
    
    // Si estamos en la ruta de búsqueda, navegar sin término
    if (this.isSearchRoute) {
      this.router.navigate(['/busqueda']);
    }
  }

  // Método para navegar directamente a la página de búsqueda al hacer clic en sugerencias
navigateToSearch(term: string): void {
  this.searchQuery = term;
  // Forzar el enfoque y luego hacer la búsqueda
  setTimeout(() => {
    this.onSearch();
  }, 50);
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