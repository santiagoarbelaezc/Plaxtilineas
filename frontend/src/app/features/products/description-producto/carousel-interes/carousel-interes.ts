import { Component, OnInit, Input, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductosService } from '../../../../services/productos.service';
import { ProductoEditable } from '../../../../models/producto.model';
import { CarouselSignalService } from '../../../../services/carousel-signal.service';
import { optimizeForThumbnail } from '../../../../utils/cloudinary-optimizer';
import { PrecioOfertaService } from '../../../../services/precio-oferta.service';

@Component({
  selector: 'app-carousel-interes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carousel-interes.html',
  styleUrls: ['./carousel-interes.css']
})
export class CarouselInteres implements OnInit, OnDestroy, OnChanges {
  @ViewChild('productosGrid') productosGrid?: ElementRef<HTMLDivElement>;

  private router = inject(Router);
  private precioOfertaService = inject(PrecioOfertaService);
  private productosService = inject(ProductosService);
  private carouselSignalService = inject(CarouselSignalService);

  @Input() titulo: string = 'Productos que podrían interesarte';
  @Input() subtitulo: string = 'Descubre productos seleccionados especialmente para ti';
  @Input() limite: number = 16;
  @Input() excluirProductoId?: number;
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

  // Para almacenar timestamp de última carga y evitar cargas muy frecuentes
  private ultimaCarga: number = 0;
  private readonly MIN_TIEMPO_ENTRE_CARGAS = 30000;

  // Suscripción a las señales
  private signalSubscription?: Subscription;
  private recargaForzadaInterna = false;

  constructor() {}

  ngOnInit(): void {
    console.log('🔄 Iniciando CarouselInteres...');
    console.log('📊 Inputs recibidos:', {
      titulo: this.titulo,
      subtitulo: this.subtitulo,
      limite: this.limite,
      excluirProductoId: this.excluirProductoId,
      forzarRecarga: this.forzarRecarga
    });

    this.cargarProductosAleatorios();
    this.suscribirASeñales();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['forzarRecarga'] || changes['excluirProductoId'] || changes['limite']) {
      console.log('🔄 Cambio detectado en inputs, recargando productos...');
      this.recargarProductos();
    }
  }

  ngOnDestroy(): void {
    if (this.signalSubscription) {
      this.signalSubscription.unsubscribe();
    }
  }

  /**
   * Suscribirse a las señales de producto seleccionado
   */
  private suscribirASeñales(): void {
    this.signalSubscription = this.carouselSignalService.productoSeleccionado$
      .subscribe((productoId: number) => {
        console.log(`🎯 Señal recibida: Producto ${productoId} seleccionado`);
        
        if (productoId > 0) {
          this.excluirProductoId = productoId;
        }
        
        this.recargarProductos();
      });
  }

  /**
   * Método para recargar productos cuando se recibe una señal
   */
  private recargarProductos(): void {
    console.log('🔄 Recargando carrusel por señal...');
    
    this.recargaForzadaInterna = true;
    this.isLoading = true;
    this.productos = [];
    this.error = null;
    this.currentPage = 0;
    
    this.cargarProductosAleatorios();
  }

  private cargarProductosAleatorios(): void {
    const ahora = Date.now();
    const esRecargaForzada = this.forzarRecarga || this.recargaForzadaInterna;
    
    if (!esRecargaForzada && (ahora - this.ultimaCarga) < this.MIN_TIEMPO_ENTRE_CARGAS) {
      console.log('⏱️  Carga evitada: tiempo mínimo entre cargas no alcanzado');
      if (this.productos.length > 0) {
        this.isLoading = false;
      }
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.ultimaCarga = ahora;
    
    console.log('🎲 Cargando productos aleatorios...');
    console.log(`🔗 Límite solicitado: ${this.limite}`);
    console.log(`🚫 Producto a excluir: ${this.excluirProductoId || 'ninguno'}`);
    console.log(`🚀 Recarga forzada: ${esRecargaForzada ? 'SÍ' : 'NO'}`);
    
    const limiteParaSolicitud = Math.max(this.limite * 2, 16);
    
    this.productosService.obtenerProductosAleatorios(limiteParaSolicitud).subscribe({
      next: (productos) => {
        console.log(`✅ Productos aleatorios obtenidos: ${productos.length}`);
        this.procesarProductos(productos);
        this.recargaForzadaInterna = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar productos aleatorios:', err);
        this.manejarError('Error al cargar productos de interés');
        this.recargaForzadaInterna = false;
      }
    });
  }

  private procesarProductos(productos: any[]): void {
    console.log(`🔍 Procesando ${productos.length} productos...`);
    
    if (this.excluirProductoId && productos.length > 0) {
      const productosAntes = productos.length;
      productos = productos.filter(p => p.id !== this.excluirProductoId);
      console.log(`🔍 Productos después de excluir ID ${this.excluirProductoId}: ${productosAntes} → ${productos.length}`);
    }
    
    const productosAleatorizados = this.mezclarArrayAleatoriamente(productos);
    const productosFinales = productosAleatorizados.slice(0, this.limite);
    
    console.log(`🎯 Productos finales después de aleatorizar: ${productosFinales.length}`);
    
    this.productos = productosFinales.map(producto => 
      this.convertirAProductoEditable(producto)
    );
    
    this.finalizarCarga();
    
    if (this.productos.length === 0) {
      console.log('ℹ️ No se encontraron productos de interés');
      this.intentarCargaAlternativa();
    }
  }

  private finalizarCarga(): void {
    this.updateItemsPerPage();
    this.isLoading = false;
    this.recargaForzadaInterna = false;
    this.currentPage = 0;
    
    if (this.productos.length > 0) {
      console.log(`🎉 ${this.productos.length} productos cargados exitosamente`);
      setTimeout(() => {
        if (this.productosGrid) {
          this.productosGrid.nativeElement.scrollLeft = 0;
        }
      }, 50);
    } else {
      console.log('ℹ️ Carrusel vacío después de finalizar carga');
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
    console.error('❌ Error:', mensaje);
    this.error = mensaje;
    this.isLoading = false;
    this.productos = [];
    this.recargaForzadaInterna = false;
  }

  private mezclarArrayAleatoriamente<T>(array: T[]): T[] {
    const mezclado = [...array];
    for (let i = mezclado.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mezclado[i], mezclado[j]] = [mezclado[j], mezclado[i]];
    }
    return mezclado;
  }

  private intentarCargaAlternativa(): void {
    if (this.excluirProductoId) {
      this.excluirProductoId = undefined;
      this.cargarProductosAleatorios();
    } else {
      this.error = 'No hay productos disponibles en este momento';
    }
  }

  recargar(): void {
    console.log('🔄 Recargando productos de interés...');
    this.recargaForzadaInterna = true;
    this.cargarProductosAleatorios();
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
    console.warn(`⚠️ Error cargando imagen para ${producto?.nombre || 'producto'}`);
    imgElement.src = 'assets/images/default-product.png';
  }

  getProductoUrl(producto: ProductoEditable): any[] {
    const slug = producto.nombre ? producto.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${producto.id}-${slug}` : producto.id;
    return ['/producto', urlParam];
  }
}