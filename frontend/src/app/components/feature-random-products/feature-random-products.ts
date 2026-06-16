import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductosService } from '../../services/productos.service';
import { MenuStateService } from '../../services/menu-state.service';
import { ProductoEditable } from '../../models/producto.model';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { optimizeForThumbnail } from '../../utils/cloudinary-optimizer';

@Component({
  selector: 'app-feature-random-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './feature-random-products.html',
  styleUrls: ['./feature-random-products.css']
})
export class FeatureRandomProducts implements OnInit {
  @ViewChild('productosGrid') productosGrid!: ElementRef;

  productos: ProductoEditable[] = [];
  loading: boolean = true;
  error: string | null = null;

  currentPage = 0;
  itemsPerPage = 5;
  pagesArray: number[] = [];
  isMobile = false;

  constructor(
    private productosService: ProductosService,
    private router: Router,
    private menuStateService: MenuStateService,
    library: FaIconLibrary
  ) {
    library.addIcons(faChevronLeft, faChevronRight, faBoxOpen);
  }

  ngOnInit(): void {
    this.checkIfMobile();
    this.cargarProductosAleatorios();
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
  }

  cargarProductosAleatorios(): void {
    this.loading = true;
    this.error = null;
    
    // Obtener 12 productos aleatorios
    this.productosService.obtenerProductosAleatorios(12).subscribe({
      next: (productos) => {
        this.productos = productos.map(p => ({
          ...p,
          editando: false
        }));
        this.loading = false;
        this.updateItemsPerPage();
        console.log('Productos aleatorios cargados:', this.productos);
      },
      error: (error) => {
        console.error('Error al cargar productos aleatorios:', error);
        this.error = 'No se pudieron cargar los productos. Por favor, intenta más tarde.';
        this.loading = false;
      }
    });
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

  onScroll(event: Event): void {
    if (!this.productosGrid || this.productos.length === 0) return;
    const grid = this.productosGrid.nativeElement;
    const scrollLeft = grid.scrollLeft;
    const itemWidth = grid.scrollWidth / this.productos.length;
    const pageWidth = itemWidth * this.itemsPerPage;
    if (pageWidth > 0) {
      const calculatedPage = Math.round(scrollLeft / pageWidth);
      if (calculatedPage !== this.currentPage && calculatedPage >= 0 && calculatedPage < this.pagesArray.length) {
        this.currentPage = calculatedPage;
      }
    }
  }

  verDetalles(productoId: number, nombre?: string): void {
    console.log('Navegando a detalles del producto:', productoId);
    this.menuStateService.clearLastSelectedSubcategory();
    
    const slug = nombre ? nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${productoId}-${slug}` : productoId;
    this.router.navigate(['/producto', urlParam]);
  }

  verTodosProductos(): void {
    console.log('🔍 Ver todos los productos');
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
    const precioFormateado = precioEntero.toLocaleString('es-ES');
    return `$ ${precioFormateado}`;
  }

  reload(): void {
    this.cargarProductosAleatorios();
  }

  optimizarImagen(url: string): string {
    return optimizeForThumbnail(url, 300);
  }
}
