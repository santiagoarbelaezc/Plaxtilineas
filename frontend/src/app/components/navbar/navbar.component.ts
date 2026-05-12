import { Component, OnInit, AfterViewInit, HostListener, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  faKey, faSearch, faTimes, faHome, faUsers, faMapMarkerAlt, 
  faShoppingBag, faClock, faUser, faEnvelope, faLock, faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { AosService } from '../../services/aos.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil, Subject, throttleTime } from 'rxjs';
import { SearchStateService } from '../../services/search-state.service';
import { MenuStateService } from '../../services/menu-state.service';
import { MenuDropdown } from './menu-dropdown/menu-dropdown';
import { EmpresasDropdown } from './empresas-dropdown/empresas-dropdown';
import { CartIconComponent } from '../../cart/cart-icon/cart-icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule, MenuDropdown, EmpresasDropdown, CartIconComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  menuAbierto = false;
  isScrolled = false;
  searchActive = false;
  
  // Variables para el buscador
  searchQuery: string = '';
  showSuggestions: boolean = false;
  isSearchRoute: boolean = false;

  private destroy$ = new Subject<void>();
  private scrollSubject = new Subject<void>();

  constructor(
    library: FaIconLibrary,
    private aosService: AosService,
    private router: Router,
    private searchStateService: SearchStateService,
    private menuStateService: MenuStateService
  ) {
    library.addIcons(
      faKey, faSearch, faTimes, faHome, faUsers, faMapMarkerAlt,
      faShoppingBag, faClock, faUser, faEnvelope, faLock, faArrowLeft
    );
  }

  ngOnInit(): void {
    this.setupRouterListener();
    this.setupSearchStateListener();
    this.setupScrollListener();
    this.checkInitialScroll();
  }

  private setupScrollListener(): void {
    this.scrollSubject.pipe(
      throttleTime(50, undefined, { leading: true, trailing: true }),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.isScrolled = window.scrollY > 20;
    });
  }

  private checkInitialScroll(): void {
    this.isScrolled = window.scrollY > 20;
  }

  ngAfterViewInit(): void {
    // Eliminamos el refresh automático de AOS para mejorar la carga inicial
    // Solo se refrescará si es estrictamente necesario
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
    document.body.style.overflow = this.menuAbierto ? 'hidden' : 'auto';
  }

  closeMenu(): void {
    this.menuAbierto = false;
    document.body.style.overflow = 'auto';
  }

  toggleSearch(): void {
    this.searchActive = !this.searchActive;
    if (this.searchActive) {
      setTimeout(() => {
        const input = document.querySelector('.mobile-search-input') as HTMLInputElement;
        if (input) input.focus();
      }, 300);
    }
  }

  onLinkClick(index: number): void {
    this.closeMenu();
  }

  closeDropdown(): void {
    this.menuStateService.closeDropdownMenu();
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

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrollSubject.next();
  }
}