import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, filter, switchMap, catchError, of } from 'rxjs';
import { ProductosService } from '../../services/productos.service';
import { ProductoEditable } from '../../models/producto.model';
import { SearchStateService } from '../../services/search-state.service';

@Component({
  selector: 'app-search-component',
  templateUrl: './search-component.html',
  styleUrls: ['./search-component.css'],
  imports: [CommonModule, FormsModule]
})
export class SearchComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Variables del estado
  terminoBusqueda: string = '';
  productos: ProductoEditable[] = [];
  productosSugeridos: ProductoEditable[] = [];
  isLoading: boolean = false;
  hasSearched: boolean = false;
  searchError: string = '';
  showSuggestions: boolean = false;
  isSearchInProgress: boolean = false;
  
  // Información de resultados
  resultadosInfo = {
    total: 0,
    termino: '',
    mensaje: ''
  };

  // Subjects para manejo de eventos
  private searchSubject = new Subject<string>();
  private searchTriggerSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private isInitialLoad: boolean = true;
  private lastSearchTerm: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private searchStateService: SearchStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupRouterListener();
    this.setupSearchTriggers();
    this.setupRealTimeSearch();
    this.setupSearchStateListener();
    
    // Procesar búsqueda inicial desde query params
    this.processInitialSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Configura el listener de cambios en la ruta
   */
  private setupRouterListener(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      // Solo procesar si estamos en la ruta de búsqueda
      if (event.url.includes('/busqueda')) {
        // Resetear flag de carga inicial
        this.isInitialLoad = true;
        // Extraer el query param de la URL
        const urlParams = new URLSearchParams(event.url.split('?')[1]);
        const searchTerm = urlParams.get('q');
        
        if (searchTerm && searchTerm !== this.lastSearchTerm) {
          this.terminoBusqueda = searchTerm;
          this.lastSearchTerm = searchTerm;
          // Actualizar el servicio
          this.searchStateService.setSearchTerm(searchTerm);
          this.performSearch(searchTerm);
        }
      }
    });
  }

  /**
   * Configura el listener del servicio de estado de búsqueda
   */
  private setupSearchStateListener(): void {
    // Escuchar cambios en el término de búsqueda desde el navbar
    this.searchStateService.searchTerm$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(term => {
      if (term && term.trim() && term !== this.terminoBusqueda) {
        this.terminoBusqueda = term;
        this.lastSearchTerm = term;
        
        // Si ya estamos en la página de búsqueda, ejecutar la búsqueda
        if (this.router.url.includes('/busqueda')) {
          this.performSearch(term);
        }
      }
    });

    // Escuchar estado de búsqueda
    this.searchStateService.isSearching$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isSearching => {
      if (isSearching && !this.isLoading) {
        this.isLoading = true;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Configura los triggers de búsqueda
   */
  private setupSearchTriggers(): void {
    this.searchTriggerSubject.pipe(
      takeUntil(this.destroy$),
      switchMap(termino => {
        if (!termino || !termino.trim()) {
          return of(null);
        }
        
        this.prepareForSearch(termino);
        
        return this.productosService.buscarProductosPorNombre(termino).pipe(
          catchError(error => {
            console.error('Error en búsqueda:', error);
            this.handleSearchError(error, termino);
            return of(null);
          })
        );
      })
    ).subscribe(response => {
      if (response) {
        this.handleSearchResponse(response);
      }
      this.isSearchInProgress = false;
      this.cdr.markForCheck();
    });
  }

  /**
   * Configura búsqueda en tiempo real
   */
  private setupRealTimeSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(termino => {
      if (termino.trim().length >= 2) {
        this.performRealTimeSearch(termino);
      } else {
        this.clearSuggestions();
      }
    });
  }

  /**
   * Procesa búsqueda inicial desde query params
   */
  private processInitialSearch(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const term = params['q'];
      
      // Solo procesar si es diferente al término actual y no es la carga inicial
      if (term && term !== this.terminoBusqueda) {
        this.terminoBusqueda = term;
        this.lastSearchTerm = term;
        this.searchStateService.setSearchTerm(term);
        
        // Ejecutar búsqueda solo si no es la carga inicial
        if (!this.isInitialLoad) {
          this.performSearch(term);
        }
        this.isInitialLoad = false;
      } else if (!term && this.hasSearched) {
        // Si no hay término pero ya se había buscado, resetear
        this.resetSearchState();
      }
    });
  }

  /**
   * Inicia búsqueda desde formulario
   */
  buscar(): void {
    const trimmedTerm = this.terminoBusqueda.trim();
    if (trimmedTerm) {
      // Actualizar el servicio
      this.searchStateService.setSearchTerm(trimmedTerm);
      
      // Usar navigate con relativeTo para mantener la ruta actual
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: trimmedTerm },
        queryParamsHandling: 'merge',
        replaceUrl: true
      }).then(() => {
        // Forzar la ejecución de la búsqueda
        this.lastSearchTerm = trimmedTerm;
        this.performSearch(trimmedTerm);
      });
    }
  }

  /**
   * Ejecuta búsqueda principal
   */
  private performSearch(termino: string): void {
    if (!this.isSearchInProgress && termino.trim()) {
      this.searchTriggerSubject.next(termino.trim());
    }
  }

  /**
   * Prepara el estado para una nueva búsqueda
   */
  private prepareForSearch(termino: string): void {
    this.isLoading = true;
    this.isSearchInProgress = true;
    this.hasSearched = true;
    this.searchError = '';
    this.showSuggestions = false;
    this.resultadosInfo.termino = termino;
    
    // Notificar al servicio
    this.searchStateService.setIsSearching(true);
    this.searchStateService.setSearchError('');
    
    // Limpiar resultados anteriores
    this.productos = [];
    this.productosSugeridos = [];
    this.resultadosInfo.total = 0;
    
    this.cdr.markForCheck();
  }

  /**
   * Maneja la respuesta de búsqueda
   */
  private handleSearchResponse(response: any): void {
    this.productos = response.resultados || [];
    this.productosSugeridos = response.sugerencias || [];
    this.resultadosInfo.total = response.total || 0;
    this.resultadosInfo.mensaje = response.mensaje || '';
    
    this.isLoading = false;
    this.isSearchInProgress = false;
    
    // Notificar al servicio
    this.searchStateService.setIsSearching(false);
    this.searchStateService.setSearchResults(response);
    
    // Enfocar input si hay resultados
    setTimeout(() => {
      if (this.searchInput && this.productos.length > 0) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
    
    this.cdr.markForCheck();
  }

  /**
   * Maneja errores de búsqueda
   */
  private handleSearchError(error: any, termino: string): void {
    console.error('Error en búsqueda:', error);
    this.searchError = 'Ocurrió un error al realizar la búsqueda';
    this.productos = [];
    this.productosSugeridos = [];
    this.resultadosInfo.total = 0;
    this.isLoading = false;
    this.isSearchInProgress = false;
    
    // Notificar al servicio
    this.searchStateService.setIsSearching(false);
    this.searchStateService.setSearchError(this.searchError);
    
    this.cdr.markForCheck();
  }

  /**
   * Realiza búsqueda en tiempo real para sugerencias
   */
  private performRealTimeSearch(termino: string): void {
    this.productosService.buscarProductosPorNombre(termino).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response && response.resultados) {
          this.productosSugeridos = response.resultados.slice(0, 5);
          this.showSuggestions = true;
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        console.error('Error en búsqueda en tiempo real:', error);
        this.clearSuggestions();
      }
    });
  }

  /**
   * Limpia sugerencias
   */
  private clearSuggestions(): void {
    this.productosSugeridos = [];
    this.showSuggestions = false;
    this.cdr.markForCheck();
  }

  /**
   * Resetea el estado de búsqueda
   */
  private resetSearchState(): void {
    this.terminoBusqueda = '';
    this.productos = [];
    this.productosSugeridos = [];
    this.hasSearched = false;
    this.searchError = '';
    this.showSuggestions = false;
    this.isLoading = false;
    this.isSearchInProgress = false;
    this.resultadosInfo = { total: 0, termino: '', mensaje: '' };
    this.lastSearchTerm = '';
    
    // Notificar al servicio
    this.searchStateService.clearSearch();
    
    this.cdr.markForCheck();
  }

  /**
   * Métodos públicos
   */
  
  seleccionarSugerencia(producto: ProductoEditable): void {
    this.terminoBusqueda = producto.nombre;
    this.showSuggestions = false;
    this.buscar();
  }

  limpiarBusqueda(): void {
    this.resetSearchState();
    
    // Limpiar query params y navegar
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onInputChange(): void {
    const trimmedTerm = this.terminoBusqueda.trim();
    if (trimmedTerm.length >= 2) {
      this.searchSubject.next(trimmedTerm);
    } else {
      this.clearSuggestions();
    }
  }

  onFocusOut(): void {
    setTimeout(() => {
      if (!this.hasSearched) {
        this.showSuggestions = false;
        this.cdr.markForCheck();
      }
    }, 200);
  }

  onKeyPress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.preventDefault();
      this.buscar();
    }
  }

  /**
   * Enfoca el input de búsqueda
   */
  focusSearchInput(): void {
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  verDetallesProducto(producto: ProductoEditable): void {
    // Guardar estado actual antes de navegar
    const currentSearch = this.terminoBusqueda;
    
    this.router.navigate(['/producto', producto.id], {
      state: { fromSearch: true, searchTerm: currentSearch }
    });
  }

  mostrarPrecio(producto: ProductoEditable): string {
    const formatearPrecio = (precio: number): string => {
      // Convertir a entero (sin decimales) y formatear con separador de miles
      const precioEntero = Math.round(precio);
      return `$ ${precioEntero.toLocaleString('es-CO', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      })}`;
    };

    // Primero verificar si tiene variantes del backend
    if (producto.variantes && producto.variantes.length > 0) {
      const precios = producto.variantes.map(v => v.precio);
      const minPrecio = Math.min(...precios);
      return `Desde ${formatearPrecio(minPrecio)}`;
    }
    
    // Si no tiene variantes, mostrar precio normal
    return formatearPrecio(producto.precio || 0);
  }

  /**
   * Track by function para ngFor
   */
  trackByProducto(index: number, producto: ProductoEditable): any {
    return producto.id || index;
  }

  /**
   * Método para reiniciar búsqueda
   */
  reiniciarBusqueda(): void {
    if (this.resultadosInfo.termino) {
      this.performSearch(this.resultadosInfo.termino);
    }
  }

  /**
   * Verifica si el producto tiene variantes
   */
  tieneVariantes(producto: ProductoEditable): boolean {
    return !!(producto.variantes && producto.variantes.length > 0);
  }
}