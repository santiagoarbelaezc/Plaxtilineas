import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductosService } from '../../services/productos.service';
import { CategoriasService } from '../../services/categorias.service';
import { MenuStateService } from '../../services/menu-state.service';
import { ProductoEditable } from '../../models/producto.model';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight, faBoxOpen } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-category-products-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './category-products-carousel.component.html',
  styleUrls: ['./category-products-carousel.component.css']
})
export class CategoryProductsCarouselComponent implements OnInit {
  @ViewChild('productosGrid') productosGrid!: ElementRef;

  categorias: any[] = [];
  categoriaSeleccionadaId: number | null = null; // null = "Todas"

  productos: ProductoEditable[] = [];
  loading: boolean = true;
  error: string | null = null;

  currentPage = 0;
  itemsPerPage = 5;
  pagesArray: number[] = [];
  isMobile = false;

  constructor(
    private productosService: ProductosService,
    private categoriasService: CategoriasService,
    private router: Router,
    private menuStateService: MenuStateService,
    library: FaIconLibrary
  ) {
    library.addIcons(faChevronLeft, faChevronRight, faBoxOpen);
  }

  ngOnInit(): void {
    this.checkIfMobile();
    this.cargarCategorias();
    this.cargarProductos();
    this.inicializarAOS();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkIfMobile();
    this.updateItemsPerPage();
  }

  private checkIfMobile(): void {
    this.isMobile = window.innerWidth < 1024;
  }

  private updateItemsPerPage(): void {
    const width = window.innerWidth;
    if (width < 640) {
      this.itemsPerPage = 1;
    } else if (width < 768) {
      this.itemsPerPage = 2;
    } else if (width < 1024) {
      this.itemsPerPage = 3;
    } else if (width < 1400) {
      this.itemsPerPage = 4;
    } else {
      this.itemsPerPage = 5;
    }
    this.updatePagesArray();
  }

  private updatePagesArray(): void {
    const totalPages = Math.ceil(this.productos.length / this.itemsPerPage);
    this.pagesArray = Array.from({ length: totalPages }, (_, i) => i);
    // Resetear a la página 0 cuando cambian los items
    this.currentPage = 0; 
  }

  cargarCategorias(): void {
    this.categoriasService.getCategorias().subscribe({
      next: (cats) => {
        this.categorias = cats;
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  seleccionarCategoria(id: number | null): void {
    this.categoriaSeleccionadaId = id;
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.loading = true;
    this.error = null;
    this.productos = [];
    
    if (this.categoriaSeleccionadaId === null) {
      // Cargar destacados/últimos si es "Todas"
      this.productosService.obtenerProductosAleatorios(15).subscribe({
        next: (productos) => this.manejarProductos(productos),
        error: (err) => this.manejarError(err)
      });
    } else {
      // Cargar productos por categoría
      this.productosService.obtenerProductosPorCategoriaId(this.categoriaSeleccionadaId).subscribe({
        next: (productos) => this.manejarProductos(productos),
        error: (err) => this.manejarError(err)
      });
    }
  }

  private manejarProductos(productos: ProductoEditable[]): void {
    this.productos = productos.map(p => ({
      ...p,
      editando: false
    }));
    this.loading = false;
    this.updateItemsPerPage();
    // Volver al inicio del carrusel
    setTimeout(() => {
      if (this.productosGrid) {
        this.productosGrid.nativeElement.scrollLeft = 0;
      }
    }, 50);
  }

  private manejarError(error: any): void {
    console.error('Error al cargar productos:', error);
    this.error = 'No se pudieron cargar los productos. Por favor, intenta más tarde.';
    this.loading = false;
  }

  scrollCarrusel(direction: 'prev' | 'next'): void {
    if (!this.productosGrid) return;
    const grid = this.productosGrid.nativeElement;
    const itemWidth = grid.scrollWidth / this.productos.length;
    const scrollAmount = itemWidth * this.itemsPerPage;

    if (direction === 'prev') {
      grid.scrollLeft -= scrollAmount;
      this.currentPage = Math.max(0, this.currentPage - 1);
    } else {
      grid.scrollLeft += scrollAmount;
      this.currentPage = Math.min(this.pagesArray.length - 1, this.currentPage + 1);
    }
  }

  goToPage(page: number): void {
    if (!this.productosGrid) return;
    const grid = this.productosGrid.nativeElement;
    const itemWidth = grid.scrollWidth / this.productos.length;
    const scrollAmount = itemWidth * this.itemsPerPage * page;

    grid.scrollTo({
      left: scrollAmount,
      behavior: 'smooth'
    });

    this.currentPage = page;
  }

  verDetalles(productoId: number, nombre?: string): void {
    this.menuStateService.clearLastSelectedSubcategory();
    const slug = nombre ? nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${productoId}-${slug}` : productoId;
    this.router.navigate(['/producto', urlParam]);
  }

  verTodosProductos(): void {
    this.menuStateService.clearLastSelectedSubcategory();
    this.router.navigate(['/productos']);
  }

  inicializarAOS(): void {
    if (typeof (window as any).AOS !== 'undefined') {
      (window as any).AOS.init({
        duration: 600,
        easing: 'ease-in-out-cubic',
        once: true,
        offset: 100
      });
    }
  }

  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    return `$ ${precioEntero.toLocaleString('es-ES')}`;
  }
}
