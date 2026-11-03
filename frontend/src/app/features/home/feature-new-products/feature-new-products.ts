import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductosService } from '../../../services/productos.service';
import { MenuStateService } from '../../../services/menu-state.service';
import { ProductoEditable } from '../../../models/producto.model';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { optimizeForThumbnail } from '../../../utils/cloudinary-optimizer';
import { PrecioOfertaService } from '../../../services/precio-oferta.service';

@Component({
  selector: 'app-feature-new-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './feature-new-products.html',
  styleUrls: ['./feature-new-products.css']
})
export class FeatureNewProducts implements OnInit, OnDestroy {
  @Input() title: string = 'EXPLORA MÁS';
  @Input() titleHighlight: string = 'PRODUCTOS';
  @Input() subtitle: string = 'Descubre nuestras últimas incorporaciones y soluciones destacadas en peletería, espumas y empaques.';

  @ViewChild('productosGrid') productosGrid!: ElementRef;

  productos: ProductoEditable[] = [];
  loading: boolean = true;
  error: string | null = null;
  readonly skeletonItems: number[] = [1, 2, 3, 4, 5];

  currentPage = 0;
  itemsPerPage = 5;
  pagesArray: number[] = [];
  isMobile = false;

  private isProgrammaticScroll = false;
  private scrollUnlockTimeout: any = null;

  constructor(
    private productosService: ProductosService,
    private router: Router,
    private menuStateService: MenuStateService,
    public precioOfertaService: PrecioOfertaService,
    private cdr: ChangeDetectorRef,
    library: FaIconLibrary
  ) {
    library.addIcons(faChevronLeft, faChevronRight, faBoxOpen);
  }

  ngOnInit(): void {
    this.checkIfMobile();
    this.cargarUltimosProductos();
    this.inicializarAOS();
  }

  ngOnDestroy(): void {
    if (this.scrollUnlockTimeout) {
      clearTimeout(this.scrollUnlockTimeout);
    }
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
    if (width < 576) {
      this.itemsPerPage = 1;
    } else if (width < 768) {
      this.itemsPerPage = 2;
    } else if (width < 1050) {
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
    if (this.currentPage >= totalPages && totalPages > 0) {
      this.currentPage = totalPages - 1;
    }
  }

  trackByProductoId(index: number, item: ProductoEditable): number {
    return item.id ?? index;
  }

  cargarUltimosProductos(): void {
    this.loading = true;
    this.error = null;
    
    this.productosService.obtenerUltimosProductos(20).subscribe({
      next: (productos) => {
        this.productos = productos.map(p => ({
          ...p,
          editando: false
        }));
        this.loading = false;
        this.updateItemsPerPage();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.error = 'No se pudieron cargar los productos. Por favor, intenta más tarde.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  scrollCarrusel(direction: 'prev' | 'next'): void {
    if (!this.productosGrid) return;
    const totalPages = this.pagesArray.length;
    if (totalPages <= 1) return;

    const targetPage = direction === 'next'
      ? Math.min(totalPages - 1, this.currentPage + 1)
      : Math.max(0, this.currentPage - 1);

    this.goToPage(targetPage);
  }

  goToPage(page: number): void {
    if (!this.productosGrid) return;
    const grid = this.productosGrid.nativeElement as HTMLElement;
    const maxScroll = grid.scrollWidth - grid.clientWidth;
    if (maxScroll <= 0) return;

    const scrollAmount = this.pagesArray.length > 1
      ? (maxScroll / (this.pagesArray.length - 1)) * page
      : 0;

    this.currentPage = page;
    this.isProgrammaticScroll = true;

    if (this.scrollUnlockTimeout) {
      clearTimeout(this.scrollUnlockTimeout);
    }
    this.scrollUnlockTimeout = setTimeout(() => {
      this.isProgrammaticScroll = false;
    }, 480);

    grid.scrollTo({
      left: scrollAmount,
      behavior: 'smooth'
    });

    this.cdr.markForCheck();
  }

  onScroll(event: Event): void {
    if (this.isProgrammaticScroll) return;
    if (!this.productosGrid || this.productos.length === 0 || this.pagesArray.length <= 1) return;
    const grid = this.productosGrid.nativeElement as HTMLElement;
    const maxScroll = grid.scrollWidth - grid.clientWidth;
    if (maxScroll <= 0) return;

    const scrollRatio = grid.scrollLeft / maxScroll;
    const calculatedPage = Math.min(
      this.pagesArray.length - 1,
      Math.max(0, Math.round(scrollRatio * (this.pagesArray.length - 1)))
    );

    if (calculatedPage !== this.currentPage) {
      this.currentPage = calculatedPage;
      this.cdr.markForCheck();
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
    return this.precioOfertaService.formatearPrecio(precio);
  }

  obtenerPrecioReferencia(precioReal: number): string {
    const precioRef = this.precioOfertaService.calcularPrecioReferencia(precioReal, 25);
    return this.precioOfertaService.formatearPrecio(precioRef);
  }

  formatearNombre(nombre: string): string {
    if (!nombre) return '';
    return nombre
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  reload(): void {
    this.cargarUltimosProductos();
  }

  optimizarImagen(url: string): string {
    return optimizeForThumbnail(url, 300);
  }
}