import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
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
export class FeatureNewProducts implements OnInit {
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
    public precioOfertaService: PrecioOfertaService,
    library: FaIconLibrary
  ) {
    library.addIcons(faChevronLeft, faChevronRight, faBoxOpen);
  }

  ngOnInit(): void {
    this.checkIfMobile();
    this.cargarUltimosProductos();
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

  cargarUltimosProductos(): void {
    this.loading = true;
    this.error = null;
    
    this.productosService.obtenerUltimosProductos().subscribe({
      next: (productos) => {
        this.productos = productos.map(p => ({
          ...p,
          editando: false
        }));
        this.loading = false;
        this.updateItemsPerPage();
        console.log('Productos cargados:', this.productos);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.error = 'No se pudieron cargar los productos. Por favor, intenta más tarde.';
        this.loading = false;
      }
    });
  }

  scrollCarrusel(direction: 'prev' | 'next'): void {
    if (!this.productosGrid) return;
    const grid = this.productosGrid.nativeElement;
    const scrollAmount = grid.clientWidth * 0.85;

    if (direction === 'prev') {
      grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  goToPage(page: number): void {
    if (!this.productosGrid) return;
    const grid = this.productosGrid.nativeElement;
    const maxScroll = grid.scrollWidth - grid.clientWidth;
    const scrollAmount = this.pagesArray.length > 1
      ? (maxScroll / (this.pagesArray.length - 1)) * page
      : 0;

    grid.scrollTo({
      left: scrollAmount,
      behavior: 'smooth'
    });

    this.currentPage = page;
  }

  onScroll(event: Event): void {
    if (!this.productosGrid || this.productos.length === 0 || this.pagesArray.length <= 1) return;
    const grid = this.productosGrid.nativeElement;
    const maxScroll = grid.scrollWidth - grid.clientWidth;
    if (maxScroll <= 0) return;

    const scrollRatio = grid.scrollLeft / maxScroll;
    const calculatedPage = Math.min(
      this.pagesArray.length - 1,
      Math.max(0, Math.round(scrollRatio * (this.pagesArray.length - 1)))
    );

    if (calculatedPage !== this.currentPage) {
      this.currentPage = calculatedPage;
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