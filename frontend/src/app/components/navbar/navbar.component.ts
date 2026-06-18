import { Component, OnInit, AfterViewInit, HostListener, ViewEncapsulation, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  faKey, faSearch, faTimes, faHome, faUsers, faMapMarkerAlt, 
  faShoppingBag, faClock, faUser, faEnvelope, faLock, faArrowLeft, faRobot, faPhoneAlt,
  faShoppingCart
} from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faInstagram, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { FormsModule } from '@angular/forms';
import { AosService } from '../../services/aos.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil, Subject, throttleTime } from 'rxjs';
import { SearchStateService } from '../../services/search-state.service';
import { MenuStateService } from '../../services/menu-state.service';
import { LeadsService } from '../../services/leads.service';
import { MenuDropdown } from './menu-dropdown/menu-dropdown';
import { EmpresasDropdown } from './empresas-dropdown/empresas-dropdown';
import { CartIconComponent } from '../../cart/cart-icon/cart-icon.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

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
  isUserRegistered = false;
  
  public authService = inject(AuthService);
  public cartService = inject(CartService);
  
  userDropdownOpen = false;
  showToast = false;
  toastMessage = '';
  private toastTimeout: any;
  
  // Variables para el buscador
  searchQuery: string = '';
  showSuggestions: boolean = false;
  isSearchRoute: boolean = false;
  
  isChatOpen: boolean = false;

  @ViewChild('bottomNav') bottomNav!: ElementRef;
  isDragging = false;
  startX = 0;
  currentDragX = 0;
  indicatorTransition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s';

  private destroy$ = new Subject<void>();
  private scrollSubject = new Subject<void>();

  constructor(
    library: FaIconLibrary,
    private aosService: AosService,
    private router: Router,
    private searchStateService: SearchStateService,
    private menuStateService: MenuStateService,
    private leadsService: LeadsService,
    private chatService: ChatService
  ) {
    library.addIcons(
      faKey, faSearch, faTimes, faHome, faUsers, faMapMarkerAlt,
      faShoppingBag, faClock, faUser, faEnvelope, faLock, faArrowLeft, faRobot, faPhoneAlt,
      faShoppingCart,
      faFacebook, faInstagram, faWhatsapp
    );
  }

  ngOnInit(): void {
    this.setupRouterListener();
    this.setupSearchStateListener();
    this.setupScrollListener();
    this.checkInitialScroll();
    
    this.leadsService.registered$.pipe(takeUntil(this.destroy$)).subscribe(isReg => {
      this.isUserRegistered = isReg;
    });

    this.chatService.isChatOpen$.pipe(takeUntil(this.destroy$)).subscribe(isOpen => {
      this.isChatOpen = isOpen;
    });
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
    if (this.menuAbierto) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }

  closeMenu(): void {
    this.menuAbierto = false;
    document.body.classList.remove('no-scroll');
  }

  goToContact(): void {
    this.closeMenu();
    this.router.navigate(['/contacto']);
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  logoutUser(): void {
    this.userDropdownOpen = false;
    this.authService.logout();
  }

  toggleCartDrawer(): void {
    this.cerrarAsistente();
    this.searchActive = false;
    this.cartService.openDrawer();
  }

  onUserAction(action: string): void {
    this.userDropdownOpen = false;
    let message = '';
    switch (action) {
      case 'editar-perfil':
      case 'actualizar-direccion':
        this.router.navigate(['/perfil']);
        return;
      case 'pedidos':
        this.router.navigate(['/pedidos']);
        break;
      case 'configuracion':
        this.router.navigate(['/configuracion']);
        break;
      default:
        message = 'Sección no encontrada.';
        break;
    }

    if (message) {
      this.showToastMessage(message);
    }
  }

  showToastMessage(message: string): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage = message;
    this.showToast = true;
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  openRegistrationModal(): void {
    this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }

  abrirAsistente(): void {
    this.cartService.closeDrawer();
    this.searchActive = false;
    this.chatService.toggleChat();
  }

  cerrarAsistente(): void {
    if (this.isChatOpen) {
      this.chatService.closeChat();
    }
  }

  cerrarAsistenteYCarrito(): void {
    this.cerrarAsistente();
    this.cartService.closeDrawer();
    this.searchActive = false;
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
        this.searchActive = false; // Cerrar el modal en móvil
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.userDropdownOpen = false;
  }

  getActiveTabIndex(): number {
    if (this.isChatOpen) return 4;
    if (this.cartService.isOpenDrawer.value || this.router.url === '/carrito') return 3;
    if (this.searchActive) return 2;
    if (this.router.url.includes('/productos')) return 1;
    if (this.router.url === '/' || this.router.url === '') return 0;
    return 0;
  }

  getTabLeft(index: number): number {
    if (!this.bottomNav) return 0;
    const items = this.bottomNav.nativeElement.querySelectorAll('.bottom-nav-item');
    const pillWidth = 50;
    if (items && items[index]) {
      const item = items[index] as HTMLElement;
      return item.offsetLeft + (item.clientWidth - pillWidth) / 2;
    }
    // Fallback matemático si los elementos no están renderizados aún
    const W = this.bottomNav.nativeElement.clientWidth || 360;
    const tabWidth = W / 5;
    return index * tabWidth + (tabWidth - pillWidth) / 2;
  }

  getIndicatorStyle(): any {
    if (!this.bottomNav) return {};
    const pillWidth = 50;
    const minLeft = this.getTabLeft(0);
    const maxLeft = this.getTabLeft(4);

    let leftPos = 0;
    if (this.isDragging) {
      leftPos = this.currentDragX - pillWidth / 2;
      // Clampear exactamente entre los centros de las pestañas de los extremos
      leftPos = Math.max(minLeft, Math.min(maxLeft, leftPos));
    } else {
      const activeIdx = this.getActiveTabIndex();
      leftPos = this.getTabLeft(activeIdx);
    }

    return {
      'transform': `translate3d(${leftPos}px, 0, 0)`,
      'transition': this.isDragging ? 'none' : this.indicatorTransition,
      'background-color': this.isChatOpen ? 'rgba(255, 255, 255, 0.15)' : 'rgba(54, 140, 68, 0.12)'
    };
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.bottomNav) return;
    const touch = event.touches[0];
    const rect = this.bottomNav.nativeElement.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;

    this.isDragging = true;
    this.startX = touchX;
    this.currentDragX = touchX;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !this.bottomNav) return;
    const touch = event.touches[0];
    const rect = this.bottomNav.nativeElement.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    this.currentDragX = touchX;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging || !this.bottomNav) return;
    this.isDragging = false;

    const W = this.bottomNav.nativeElement.clientWidth || 360;
    const tabWidth = W / 5;
    const finalIndex = Math.max(0, Math.min(4, Math.floor(this.currentDragX / tabWidth)));

    this.navigateTab(finalIndex);
  }

  onMouseDown(event: MouseEvent): void {
    if (!this.bottomNav) return;
    const rect = this.bottomNav.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    this.isDragging = true;
    this.startX = mouseX;
    this.currentDragX = mouseX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDragging) return;
      const moveX = moveEvent.clientX - rect.left;
      this.currentDragX = moveX;
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      this.isDragging = false;
      const upX = upEvent.clientX - rect.left;
      const W = this.bottomNav.nativeElement.clientWidth || 360;
      const tabWidth = W / 5;
      const finalIndex = Math.max(0, Math.min(4, Math.floor(upX / tabWidth)));
      this.navigateTab(finalIndex);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  navigateTab(index: number): void {
    switch (index) {
      case 0:
        this.cerrarAsistenteYCarrito();
        this.router.navigate(['/']);
        break;
      case 1:
        this.cerrarAsistenteYCarrito();
        this.router.navigate(['/productos']);
        break;
      case 2:
        this.cerrarAsistenteYCarrito();
        this.toggleSearch();
        break;
      case 3:
        this.toggleCartDrawer();
        break;
      case 4:
        this.abrirAsistente();
        break;
    }
  }
}