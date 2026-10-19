import { Component, OnInit, Input, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductosService } from '../../../services/productos.service';
import { ProductoEditable } from '../../../models/producto.model';
import { CarouselSignalService } from '../../../services/carousel-signal.service';
import { optimizeForThumbnail } from '../../../utils/cloudinary-optimizer';
import { PrecioOfertaService } from '../../../services/precio-oferta.service';

@Component({
  selector: 'app-carousel-relacionados',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carousel-relacionados.html',
  styleUrls: ['./carousel-relacionados.css']
})
export class CarouselRelacionados implements OnInit, OnDestroy, OnChanges {
  @ViewChild('productosGrid') productosGrid?: ElementRef<HTMLDivElement>;

  private router = inject(Router);
  private precioOfertaService = inject(PrecioOfertaService);
  private productosService = inject(ProductosService);
  private carouselSignalService = inject(CarouselSignalService);

  @Input() titulo: string = 'Productos relacionados';
  @Input() subtitulo: string = 'Descubre productos similares que podrían interesarte';
  @Input() limite: number = 10;
  @Input() subcategoriaId?: number;
  @Input() productoId?: number;
  @Input() forzarRecarga: boolean = false;
  
  productos: ProductoEditable[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  
  currentPage = 0;
  itemsPerPage = 5;
  pagesArray: number[] = [];

  get tituloPartes(): { inicio: string; destacado: string } {
    if (!this.titulo) return { inicio: '', destacado: '' };
    const palabras = this.titulo.trim().toUpperCase().split(' ');
    if (palabras.length === 1) {
      return { inicio: '', destacado: palabras[0] };
    }
    const destacado = palabras.pop() || '';
    return { inicio: palabras.join(' '), destacado };
  }

  private ultimaCarga: number = 0;
  private readonly MIN_TIEMPO_ENTRE_CARGAS = 30000;

  private signalSubscription?: Subscription;
  private recargaForzadaInterna = false;

  private productosRelacionados: any[] = [];
  private productosGenerales: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.cargarProductosRelacionados();
    this.suscribirASeñales();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['forzarRecarga'] || changes['subcategoriaId'] || changes['productoId'] || changes['limite']) {
      this.recargarProductos();
    }
  }

  ngOnDestroy(): void {
    if (this.signalSubscription) {
      this.signalSubscription.unsubscribe();
    }
  }

  private suscribirASeñales(): void {
    this.signalSubscription = this.carouselSignalService.productoSeleccionado$
      .subscribe((productoId: number) => {
        this.productoId = productoId;
        this.recargarProductos();
      });
  }

  private cargarProductosRelacionados(): void {
    const ahora = Date.now();
    const esRecargaForzada = this.forzarRecarga || this.recargaForzadaInterna;
    
    if (!esRecargaForzada && (ahora - this.ultimaCarga) < this.MIN_TIEMPO_ENTRE_CARGAS) {
      if (this.productos.length > 0) {
        this.isLoading = false;
      }
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.ultimaCarga = ahora;
    this.productosRelacionados = [];
    this.productosGenerales = [];

    if (this.subcategoriaId && this.subcategoriaId > 0) {
      this.cargarProductosPorSubcategoria();
    } else if (this.productoId && this.productoId > 0) {
      this.obtenerSubcategoriaDelProducto();
    } else {
      this.cargarSoloProductosGenerales();
    }
  }

  private cargarProductosPorSubcategoria(): void {
    const limiteRelacionados = Math.max(this.limite * 2, 20);
    
    this.productosService.obtenerProductosPorSubcategoria(this.subcategoriaId!).subscribe({
      next: (productos) => {
        if (this.productoId && productos.length > 0) {
          productos = productos.filter(p => p.id !== this.productoId);
        }
        
        this.productosRelacionados = productos;
        
        if (this.productosRelacionados.length >= this.limite) {
          this.procesarProductosFinales();
        } else {
          this.cargarProductosGeneralesParaCompletar();
        }
      },
      error: () => {
        this.cargarSoloProductosGenerales();
      }
    });
  }

  private obtenerSubcategoriaDelProducto(): void {
    this.productosService.obtenerProductoPorId(this.productoId!).subscribe({
      next: (producto) => {
        if (!producto) {
          this.cargarSoloProductosGenerales();
          return;
        }
        if (producto.subcategoria_id && producto.subcategoria_id > 0) {
          this.subcategoriaId = producto.subcategoria_id;
          this.cargarProductosPorSubcategoria();
        } else {
          this.cargarSoloProductosGenerales();
        }
      },
      error: () => {
        this.cargarSoloProductosGenerales();
      }
    });
  }

  private cargarProductosGeneralesParaCompletar(): void {
    const cantidadNecesaria = this.limite - this.productosRelacionados.length;
    const limiteAdicional = Math.max(cantidadNecesaria * 3, 15);
    
    this.productosService.obtenerProductosAleatorios(limiteAdicional).subscribe({
      next: (productos) => {
        const idsRelacionados = new Set(this.productosRelacionados.map(p => p.id));
        this.productosGenerales = productos.filter(p => p && !idsRelacionados.has(p.id));
        this.procesarProductosFinales();
      },
      error: () => {
        this.procesarProductosFinales();
      }
    });
  }

  private cargarSoloProductosGenerales(): void {
    const limiteAmpliado = Math.max(this.limite * 2, 20);
    
    this.productosService.obtenerProductosAleatorios(limiteAmpliado).subscribe({
      next: (productos) => {
        if (this.productoId && productos.length > 0) {
          productos = productos.filter(p => p.id !== this.productoId);
        }
        this.productosGenerales = productos;
        this.productosRelacionados = [];
        this.procesarProductosFinales();
      },
      error: () => {
        this.manejarError('Error al cargar productos');
      }
    });
  }

  private procesarProductosFinales(): void {
    let productosCombinados = [...this.productosRelacionados];
    const espaciosDisponibles = this.limite - productosCombinados.length;
    
    if (espaciosDisponibles > 0 && this.productosGenerales.length > 0) {
      const productosGeneralesTomar = Math.min(espaciosDisponibles, this.productosGenerales.length);
      productosCombinados = [...productosCombinados, ...this.productosGenerales.slice(0, productosGeneralesTomar)];
    }
    
    const productosFinales = productosCombinados.slice(0, this.limite);
    this.productos = productosFinales.map(producto => this.convertirAProductoEditable(producto));
    this.finalizarCarga();
  }

  private finalizarCarga(): void {
    this.updateItemsPerPage();
    this.isLoading = false;
    this.recargaForzadaInterna = false;
    this.currentPage = 0;
    
    if (this.productos.length > 0) {
      setTimeout(() => {
        if (this.productosGrid) {
          this.productosGrid.nativeElement.scrollLeft = 0;
        }
      }, 50);
    } else {
      this.error = 'No hay productos relacionados disponibles';
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateItemsPerPage();
  }

  private updateItemsPerPage(): void {
    const width = window.innerWidth;
    if (width < 640) {
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
    this.pagesArray = Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i);
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
    const slug = nombre ? nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${productoId}-${slug}` : productoId;
    this.router.navigate(['/producto', urlParam]);
  }

  private manejarError(mensaje: string): void {
    this.error = mensaje;
    this.isLoading = false;
    this.productos = [];
    this.productosRelacionados = [];
    this.productosGenerales = [];
    this.recargaForzadaInterna = false;
  }

  private recargarProductos(): void {
    this.recargaForzadaInterna = true;
    this.isLoading = true;
    this.productos = [];
    this.productosRelacionados = [];
    this.productosGenerales = [];
    this.error = null;
    this.currentPage = 0;
    this.subcategoriaId = undefined;
    this.cargarProductosRelacionados();
  }

  private convertirAProductoEditable(producto: any): ProductoEditable {
    if (!producto) {
      return {
        id: 0,
        nombre: 'Producto no disponible',
        descripcion: '',
        cantidad: 0,
        precio: 0,
        imagen_url: '',
        subcategoria_id: 0,
        subcategoria: 'Sin categoría',
        categoria: 'Sin categoría',
        editando: false
      };
    }
    
    return {
      id: producto.id || 0,
      nombre: producto.nombre || 'Producto sin nombre',
      descripcion: producto.descripcion || '',
      cantidad: producto.cantidad || 0,
      precio: producto.precio || 0,
      imagen_url: producto.imagen_url || '',
      subcategoria_id: producto.subcategoria_id || 0,
      subcategoria: typeof producto.subcategoria === 'string' 
        ? producto.subcategoria 
        : (producto.subcategoria?.nombre || 'Sin categoría'),
      categoria: typeof producto.categoria === 'string'
        ? producto.categoria
        : (producto.categoria?.nombre || 'Sin categoría'),
      editando: false,
      nuevaImagen: producto.nuevaImagen
    };
  }

  recargar(): void {
    this.recargarProductos();
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

  getProductoImagen(producto: ProductoEditable): string {
    if (producto?.imagen_url && producto.imagen_url.trim() !== '') {
      return optimizeForThumbnail(producto.imagen_url, 300);
    }
    return 'assets/images/default-product.png';
  }

  handleImageError(event: Event, producto: ProductoEditable): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/default-product.png';
  }

  getProductoUrl(producto: ProductoEditable): any[] {
    const slug = producto.nombre ? producto.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${producto.id}-${slug}` : producto.id;
    return ['/producto', urlParam];
  }
}