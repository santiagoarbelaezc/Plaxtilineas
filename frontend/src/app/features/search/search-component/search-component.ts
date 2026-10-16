import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, catchError, of } from 'rxjs';
import { ProductosService } from '../../../services/productos.service';
import { ProductoEditable } from '../../../models/producto.model';
import { SearchStateService } from '../../../services/search-state.service';
import { optimizeForThumbnail } from '../../../utils/cloudinary-optimizer';

@Component({
  selector: 'app-search-component',
  standalone: true,
  templateUrl: './search-component.html',
  styleUrls: ['./search-component.css'],
  imports: [CommonModule, FormsModule]
})
export class SearchComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Variables del estado
  terminoBusqueda: string = '';
  productos: ProductoEditable[] = [];
  todosLosProductos: ProductoEditable[] = [];
  productosSugeridos: ProductoEditable[] = [];
  isLoading: boolean = false;
  isLoadingInicial: boolean = true;
  hasSearched: boolean = false;
  searchError: string = '';
  showSuggestions: boolean = false;
  isSearchInProgress: boolean = false;

  // Búsquedas frecuentes y recientes (términos en singular)
  busquedasFrecuentes: string[] = ['Espuma', 'Plástico', 'Empaque', 'Malla', 'Colchón', 'Tela', 'Lona', 'Cinta'];
  busquedasRecientes: string[] = [];

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

  private lastSearchTerm: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private searchStateService: SearchStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarBusquedasRecientes();
    this.setupSearchTriggers();
    this.setupRealTimeSearch();
    this.setupRouterListener();
    this.setupSearchStateListener();
    this.cargarTodosLosProductos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga inicial de todos los productos para mostrar por defecto antes de buscar
   */
  cargarTodosLosProductos(): void {
    this.isLoadingInicial = true;
    this.productosService.obtenerProductos().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error al cargar catálogo inicial:', err);
        this.isLoadingInicial = false;
        return of([]);
      })
    ).subscribe((prods) => {
      this.todosLosProductos = prods || [];
      this.isLoadingInicial = false;

      // Si no hay término de búsqueda activo, mostrar todos los productos por defecto
      if (!this.terminoBusqueda.trim() && !this.hasSearched) {
        this.productos = [...this.todosLosProductos];
        this.resultadosInfo = {
          total: this.todosLosProductos.length,
          termino: '',
          mensaje: ''
        };
      }
      this.cdr.markForCheck();
    });
  }

  /**
   * Cargar búsquedas recientes desde localStorage
   */
  cargarBusquedasRecientes(): void {
    try {
      const saved = localStorage.getItem('recent_searches');
      if (saved) {
        this.busquedasRecientes = JSON.parse(saved);
      }
    } catch (e) {
      this.busquedasRecientes = [];
    }
  }

  /**
   * Guardar un nuevo término en búsquedas recientes
   */
  guardarBusquedaReciente(term: string): void {
    const cleanTerm = term.trim();
    if (!cleanTerm || cleanTerm.length < 2) return;

    // Filtrar si ya existe (case insensitive) y colocar al inicio
    this.busquedasRecientes = [
      cleanTerm,
      ...this.busquedasRecientes.filter(t => t.toLowerCase() !== cleanTerm.toLowerCase())
    ].slice(0, 8); // Máximo 8 recientes

    try {
      localStorage.setItem('recent_searches', JSON.stringify(this.busquedasRecientes));
    } catch (e) { }
  }

  /**
   * Eliminar un elemento individual de búsquedas recientes
   */
  eliminarBusquedaReciente(term: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.busquedasRecientes = this.busquedasRecientes.filter(t => t !== term);
    try {
      localStorage.setItem('recent_searches', JSON.stringify(this.busquedasRecientes));
    } catch (e) { }
  }

  /**
   * Limpiar todo el historial de búsquedas recientes
   */
  limpiarHistorialReciente(): void {
    this.busquedasRecientes = [];
    try {
      localStorage.removeItem('recent_searches');
    } catch (e) { }
  }

  /**
   * Ejecutar búsqueda directa al dar clic en un tag/pill reciente o frecuente
   */
  ejecutarBusquedaDirecta(term: string): void {
    this.terminoBusqueda = term;
    this.guardarBusquedaReciente(term);
    this.showSuggestions = false;
    this.buscar();
  }

  /**
   * Navegar atrás o a la página principal
   */
  volverAtras(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  /**
   * Listener de cambios en la ruta (Query Params)
   */
  private setupRouterListener(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const searchTerm = params['q'];
      if (searchTerm !== undefined) {
        const term = searchTerm ? searchTerm.trim() : '';
        if (term !== this.lastSearchTerm) {
          this.terminoBusqueda = term;
          this.lastSearchTerm = term;
          this.searchStateService.setSearchTerm(term);

          if (term) {
            this.guardarBusquedaReciente(term);
            this.performSearch(term);
          } else {
            this.resetSearchState();
          }
        }
      }
    });
  }

  /**
   * Listener de cambios en SearchStateService
   */
  private setupSearchStateListener(): void {
    this.searchStateService.searchTerm$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(term => {
      if (term && term.trim() && term !== this.terminoBusqueda) {
        this.terminoBusqueda = term;
        this.lastSearchTerm = term;
        if (this.router.url.includes('/busqueda')) {
          this.guardarBusquedaReciente(term);
          this.performSearch(term);
        }
      }
    });

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
   * Configurar triggers de búsqueda
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

  private setupRealTimeSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(termino => {
      if (termino.trim().length >= 2) {
        this.performRealTimeSearch(termino);
      } else if (termino.trim().length === 0) {
        this.limpiarBusqueda();
      } else {
        this.clearSuggestions();
      }
    });
  }

  /**
   * Inicia búsqueda desde formulario o botón
   */
  buscar(): void {
    const trimmedTerm = this.terminoBusqueda.trim();
    if (trimmedTerm) {
      this.guardarBusquedaReciente(trimmedTerm);
      this.searchStateService.setSearchTerm(trimmedTerm);

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: trimmedTerm },
        queryParamsHandling: 'merge',
        replaceUrl: true
      }).then(() => {
        this.lastSearchTerm = trimmedTerm;
        this.performSearch(trimmedTerm);
      });
    } else {
      this.limpiarBusqueda();
    }
  }

  private performSearch(termino: string): void {
    if (termino.trim()) {
      this.searchTriggerSubject.next(termino.trim());
    } else {
      this.resetSearchState();
    }
  }

  private prepareForSearch(termino: string): void {
    this.isLoading = true;
    this.isSearchInProgress = true;
    this.hasSearched = true;
    this.searchError = '';
    this.showSuggestions = false;
    this.resultadosInfo.termino = termino;

    this.searchStateService.setIsSearching(true);
    this.searchStateService.setSearchError('');

    this.productos = [];
    this.productosSugeridos = [];
    this.resultadosInfo.total = 0;

    this.cdr.markForCheck();
  }

  private handleSearchResponse(response: any): void {
    let resultados = response.resultados || [];

    // Fallback: si el backend no encuentra o da pocos resultados, filtrar localmente sobre todosLosProductos
    if (resultados.length === 0 && this.todosLosProductos.length > 0 && this.resultadosInfo.termino) {
      const termNorm = this.normalizarTexto(this.resultadosInfo.termino);
      resultados = this.todosLosProductos.filter(p =>
        this.normalizarTexto(p.nombre || '').includes(termNorm) ||
        this.normalizarTexto(p.descripcion || '').includes(termNorm) ||
        this.normalizarTexto(p.categoria || '').includes(termNorm) ||
        this.normalizarTexto(p.subcategoria || '').includes(termNorm)
      );
    }

    this.productos = resultados;
    this.productosSugeridos = response.sugerencias || [];
    this.resultadosInfo.total = resultados.length;
    this.resultadosInfo.mensaje = response.mensaje || '';

    this.isLoading = false;
    this.isSearchInProgress = false;

    this.searchStateService.setIsSearching(false);
    this.searchStateService.setSearchResults(response);

    this.cdr.markForCheck();
  }

  private handleSearchError(error: any, termino: string): void {
    console.error('Error en búsqueda:', error);

    // Intentar filtrado local en caso de error de red
    if (this.todosLosProductos.length > 0 && termino) {
      const termNorm = this.normalizarTexto(termino);
      this.productos = this.todosLosProductos.filter(p =>
        this.normalizarTexto(p.nombre || '').includes(termNorm) ||
        this.normalizarTexto(p.descripcion || '').includes(termNorm) ||
        this.normalizarTexto(p.categoria || '').includes(termNorm)
      );
      this.resultadosInfo.total = this.productos.length;
      this.resultadosInfo.termino = termino;
      this.searchError = '';
    } else {
      this.searchError = 'Ocurrió un error al realizar la búsqueda';
      this.productos = [];
      this.resultadosInfo.total = 0;
    }

    this.isLoading = false;
    this.isSearchInProgress = false;
    this.searchStateService.setIsSearching(false);

    this.cdr.markForCheck();
  }

  private performRealTimeSearch(termino: string): void {
    const termNorm = this.normalizarTexto(termino);
    // Filtrado local inmediato para respuestas instantáneas
    if (this.todosLosProductos.length > 0) {
      this.productosSugeridos = this.todosLosProductos.filter(p =>
        this.normalizarTexto(p.nombre || '').includes(termNorm) ||
        this.normalizarTexto(p.categoria || '').includes(termNorm)
      ).slice(0, 5);
      this.showSuggestions = this.productosSugeridos.length > 0;
      this.cdr.markForCheck();
    }

    this.productosService.buscarProductosPorNombre(termino).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response && response.resultados && response.resultados.length > 0) {
          this.productosSugeridos = response.resultados.slice(0, 5);
          this.showSuggestions = true;
          this.cdr.markForCheck();
        }
      },
      error: () => {}
    });
  }

  private clearSuggestions(): void {
    this.productosSugeridos = [];
    this.showSuggestions = false;
    this.cdr.markForCheck();
  }

  private resetSearchState(): void {
    this.terminoBusqueda = '';
    this.productos = [...this.todosLosProductos];
    this.productosSugeridos = [];
    this.hasSearched = false;
    this.searchError = '';
    this.showSuggestions = false;
    this.isLoading = false;
    this.isSearchInProgress = false;
    this.resultadosInfo = { total: this.todosLosProductos.length, termino: '', mensaje: '' };
    this.lastSearchTerm = '';

    this.searchStateService.clearSearch();
    this.cdr.markForCheck();
  }

  seleccionarSugerencia(producto: ProductoEditable): void {
    this.terminoBusqueda = producto.nombre;
    this.showSuggestions = false;
    this.guardarBusquedaReciente(producto.nombre);
    this.buscar();
  }

  limpiarBusqueda(): void {
    this.resetSearchState();
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
    } else if (trimmedTerm.length === 0) {
      this.resetSearchState();
    } else {
      this.clearSuggestions();
    }
  }

  onFocusOut(): void {
    setTimeout(() => {
      this.showSuggestions = false;
      this.cdr.markForCheck();
    }, 200);
  }

  onKeyPress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.preventDefault();
      this.buscar();
    }
  }

  focusSearchInput(): void {
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  verDetallesProducto(producto: ProductoEditable): void {
    const currentSearch = this.terminoBusqueda;
    const slug = producto.nombre ? producto.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${producto.id}-${slug}` : producto.id;

    this.router.navigate(['/producto', urlParam], {
      state: { fromSearch: true, searchTerm: currentSearch }
    });
  }

  mostrarPrecio(producto: ProductoEditable): string {
    const formatearPrecio = (precio: number): string => {
      if (precio === null || precio === undefined) return '$ 0';
      const precioEntero = Math.round(precio);
      return `$ ${precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    };

    if (producto.variantes && producto.variantes.length > 0) {
      const precios = producto.variantes.map(v => v.precio);
      const minPrecio = Math.min(...precios);
      return `Desde ${formatearPrecio(minPrecio)}`;
    }

    return formatearPrecio(producto.precio || 0);
  }

  trackByProducto(index: number, producto: ProductoEditable): any {
    return producto.id || index;
  }

  reiniciarBusqueda(): void {
    if (this.resultadosInfo.termino) {
      this.performSearch(this.resultadosInfo.termino);
    } else {
      this.cargarTodosLosProductos();
    }
  }

  tieneVariantes(producto: ProductoEditable): boolean {
    return !!(producto.variantes && producto.variantes.length > 0);
  }

  optimizarImagen(url: string): string {
    return optimizeForThumbnail(url, 240);
  }

  private normalizarTexto(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}