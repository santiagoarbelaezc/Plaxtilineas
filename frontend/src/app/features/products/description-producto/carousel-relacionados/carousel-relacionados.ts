import { Component, OnInit, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductosService } from '../../../../services/productos.service';
import { ProductoEditable } from '../../../../models/producto.model';
import { CarouselSignalService } from '../../../../services/carousel-signal.service';
import { optimizeForThumbnail } from '../../../../utils/cloudinary-optimizer';
import { PrecioOfertaService } from '../../../../services/precio-oferta.service';

@Component({
  selector: 'app-carousel-relacionados',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carousel-relacionados.html',
  styleUrls: ['./carousel-relacionados.css']
})
export class CarouselRelacionados implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  private precioOfertaService = inject(PrecioOfertaService);

  @Input() titulo: string = 'Productos relacionados';
  @Input() subtitulo: string = 'Descubre productos similares que podrían interesarte';
  @Input() limite: number = 10; // Mínimo 10 productos
  @Input() subcategoriaId?: number;
  @Input() productoId?: number;
  @Input() forzarRecarga: boolean = false;
  
  productos: ProductoEditable[] = [];
  public carouselId = 'productos-relacionados-carousel';
  isLoading: boolean = false;
  error: string | null = null;
  
  // Variables para el carrusel
  currentIndex = 0;
  visibleItems = 4;

  // Para almacenar timestamp de última carga
  private ultimaCarga: number = 0;
  private readonly MIN_TIEMPO_ENTRE_CARGAS = 30000;

  // Suscripción a las señales
  private signalSubscription?: Subscription;
  private recargaForzadaInterna = false;

  // Para almacenar productos relacionados y generales por separado
  private productosRelacionados: any[] = [];
  private productosGenerales: any[] = [];

  constructor(
    private productosService: ProductosService,
    private carouselSignalService: CarouselSignalService
  ) {}

  ngOnInit(): void {
    console.log('🔄 Iniciando CarouselRelacionados...');
    console.log('📊 Inputs recibidos:', {
      titulo: this.titulo,
      subtitulo: this.subtitulo,
      limite: this.limite,
      subcategoriaId: this.subcategoriaId,
      productoId: this.productoId,
      forzarRecarga: this.forzarRecarga
    });

    this.cargarProductosRelacionados();
    this.suscribirASeñales();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recargar si cambian parámetros relevantes
    if (changes['forzarRecarga'] || changes['subcategoriaId'] || changes['productoId'] || changes['limite']) {
      console.log('🔄 Cambio detectado en inputs, recargando productos...');
      this.recargarProductos();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCarousel();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.signalSubscription) {
      this.signalSubscription.unsubscribe();
    }
  }

  /**
   * Suscribirse a señales de producto seleccionado
   */
  private suscribirASeñales(): void {
    this.signalSubscription = this.carouselSignalService.productoSeleccionado$
      .subscribe((productoId: number) => {
        console.log(`🎯 Señal recibida: Producto ${productoId} seleccionado`);
        
        // Actualizar producto actual
        this.productoId = productoId;
        
        // Recargar productos relacionados para el nuevo producto
        this.recargarProductos();
      });
  }

  /**
   * Método principal para cargar productos relacionados
   */
  private cargarProductosRelacionados(): void {
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
    this.productosRelacionados = [];
    this.productosGenerales = [];
    
    console.log('🔄 Cargando productos relacionados...');
    console.log(`🔗 Subcategoría ID: ${this.subcategoriaId}`);
    console.log(`🚫 Producto a excluir: ${this.productoId || 'ninguno'}`);
    console.log(`🎯 Límite deseado: ${this.limite}`);
    console.log(`🚀 Recarga forzada: ${esRecargaForzada ? 'SÍ' : 'NO'}`);

    // Si tenemos subcategoría, cargar productos de esa subcategoría
    if (this.subcategoriaId && this.subcategoriaId > 0) {
      this.cargarProductosPorSubcategoria();
    } else if (this.productoId && this.productoId > 0) {
      // Si tenemos producto pero no subcategoría, obtener primero la subcategoría
      this.obtenerSubcategoriaDelProducto();
    } else {
      // Si no hay subcategoría ni producto, cargar productos generales
      this.cargarSoloProductosGenerales();
    }
  }

  /**
   * Cargar productos por subcategoría (productos relacionados)
   */
  private cargarProductosPorSubcategoria(): void {
    console.log(`🔍 Buscando productos RELACIONADOS de subcategoría ${this.subcategoriaId}...`);
    
    // Pedir bastante productos para tener variedad de relacionados
    const limiteRelacionados = Math.max(this.limite * 2, 20);
    
    this.productosService.obtenerProductosPorSubcategoria(this.subcategoriaId!).subscribe({
      next: (productos) => {
        console.log(`✅ ${productos.length} productos RELACIONADOS encontrados`);
        
        // 1. Excluir el producto actual si existe
        if (this.productoId && productos.length > 0) {
          const antes = productos.length;
          productos = productos.filter(p => p.id !== this.productoId);
          console.log(`🚫 Productos relacionados después de excluir ID ${this.productoId}: ${antes} → ${productos.length}`);
        }
        
        // 2. Guardar productos relacionados
        this.productosRelacionados = productos;
        
        // 3. Verificar si necesitamos productos generales para completar
        if (this.productosRelacionados.length >= this.limite) {
          console.log(`✅ Tenemos suficientes productos relacionados (${this.productosRelacionados.length})`);
          this.procesarProductosFinales();
        } else {
          console.log(`⚠️ Necesitamos ${this.limite - this.productosRelacionados.length} productos adicionales`);
          this.cargarProductosGeneralesParaCompletar();
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar productos relacionados:', err);
        // Si falla la carga de relacionados, cargar solo productos generales
        this.cargarSoloProductosGenerales();
      }
    });
  }

  /**
   * Obtener la subcategoría de un producto específico
   */
  private obtenerSubcategoriaDelProducto(): void {
    console.log(`🔍 Obteniendo detalles del producto ${this.productoId}...`);
    
    this.productosService.obtenerProductoPorId(this.productoId!).subscribe({
      next: (producto) => {
        if (!producto) {
          console.log('⚠️ Producto no encontrado');
          this.cargarSoloProductosGenerales();
          return;
        }
        
        console.log(`✅ Producto obtenido: ${producto.nombre}`);
        
        // Extraer subcategoría del producto
        if (producto.subcategoria_id && producto.subcategoria_id > 0) {
          this.subcategoriaId = producto.subcategoria_id;
          console.log(`🎯 Subcategoría encontrada: ${this.subcategoriaId}`);
          
          // Ahora cargar productos de esa subcategoría
          this.cargarProductosPorSubcategoria();
        } else {
          console.log('⚠️ Producto sin subcategoría, cargando productos generales');
          this.cargarSoloProductosGenerales();
        }
      },
      error: (err) => {
        console.error('❌ Error al obtener producto:', err);
        this.cargarSoloProductosGenerales();
      }
    });
  }

  /**
   * Cargar productos generales para completar el límite
   */
  private cargarProductosGeneralesParaCompletar(): void {
    const cantidadNecesaria = this.limite - this.productosRelacionados.length;
    const limiteAdicional = Math.max(cantidadNecesaria * 3, 15); // Pedir extras para excluir duplicados
    
    console.log(`🔄 Cargando ${limiteAdicional} productos generales para completar...`);
    
    this.productosService.obtenerProductosAleatorios(limiteAdicional).subscribe({
      next: (productos) => {
        console.log(`✅ ${productos.length} productos generales obtenidos`);
        
        // Excluir productos que ya están en los relacionados
        const idsRelacionados = new Set(this.productosRelacionados.map(p => p.id));
        const productosFiltrados = productos.filter(p => p && !idsRelacionados.has(p.id));
        
        console.log(`🔍 Productos generales únicos: ${productosFiltrados.length}`);
        
        // Guardar productos generales
        this.productosGenerales = productosFiltrados;
        
        // Procesar productos finales
        this.procesarProductosFinales();
      },
      error: (err) => {
        console.error('❌ Error al cargar productos generales:', err);
        // Si falla, usar solo los productos relacionados que tengamos
        this.procesarProductosFinales();
      }
    });
  }

  /**
   * Cargar solo productos generales (cuando no hay subcategoría)
   */
  private cargarSoloProductosGenerales(): void {
    console.log('🎲 Cargando SOLO productos generales...');
    
    const limiteAmpliado = Math.max(this.limite * 2, 20);
    
    this.productosService.obtenerProductosAleatorios(limiteAmpliado).subscribe({
      next: (productos) => {
        console.log(`✅ ${productos.length} productos generales obtenidos`);
        
        // Excluir producto actual si existe
        if (this.productoId && productos.length > 0) {
          const antes = productos.length;
          productos = productos.filter(p => p.id !== this.productoId);
          console.log(`🚫 Productos generales después de excluir ID ${this.productoId}: ${antes} → ${productos.length}`);
        }
        
        // Guardar como productos generales
        this.productosGenerales = productos;
        this.productosRelacionados = []; // No hay productos relacionados
        
        // Procesar productos finales
        this.procesarProductosFinales();
      },
      error: (err) => {
        console.error('❌ Error al cargar productos generales:', err);
        this.manejarError('Error al cargar productos');
      }
    });
  }

  /**
   * Procesar y combinar productos finales
   * Los productos relacionados van PRIMERO
   */
  private procesarProductosFinales(): void {
    console.log('🔀 Combinando productos finales...');
    console.log(`📊 Relacionados: ${this.productosRelacionados.length}, Generales: ${this.productosGenerales.length}`);
    
    // 1. Tomar todos los productos relacionados (vienen primero)
    let productosCombinados = [...this.productosRelacionados];
    
    // 2. Calcular cuántos productos generales necesitamos
    const espaciosDisponibles = this.limite - productosCombinados.length;
    
    if (espaciosDisponibles > 0 && this.productosGenerales.length > 0) {
      // 3. Tomar productos generales necesarios para completar
      const productosGeneralesTomar = Math.min(espaciosDisponibles, this.productosGenerales.length);
      const productosGeneralesSeleccionados = this.productosGenerales.slice(0, productosGeneralesTomar);
      
      // 4. Agregar productos generales al final
      productosCombinados = [...productosCombinados, ...productosGeneralesSeleccionados];
      
      console.log(`➕ Agregados ${productosGeneralesSeleccionados.length} productos generales al final`);
    }
    
    // 5. Limitar al límite máximo
    const productosFinales = productosCombinados.slice(0, this.limite);
    
    console.log(`🎯 Productos finales: ${productosFinales.length} (Relacionados: ${this.productosRelacionados.length}, Generales: ${productosFinales.length - this.productosRelacionados.length})`);
    
    // 6. Convertir a ProductoEditable
    this.productos = productosFinales.map(producto => 
      this.convertirAProductoEditable(producto)
    );
    
    this.finalizarCarga();
  }

  /**
   * Finalizar el proceso de carga
   */
  private finalizarCarga(): void {
    this.calculateVisibleItems();
    this.isLoading = false;
    this.recargaForzadaInterna = false;
    
    if (this.productos.length > 0) {
      console.log(`🎉 ${this.productos.length} productos cargados exitosamente`);
      console.log(`📍 PRIMEROS productos del carrusel: ${this.productosRelacionados.length} productos relacionados`);
      
      // Inicializar carrusel
      setTimeout(() => {
        this.initCarousel();
      }, 100);
    } else {
      console.log('ℹ️ No se encontraron productos');
      this.error = 'No hay productos relacionados disponibles';
    }
  }

  /**
   * Manejar errores
   */
  private manejarError(mensaje: string): void {
    console.error('❌ Error:', mensaje);
    this.error = mensaje;
    this.isLoading = false;
    this.productos = [];
    this.productosRelacionados = [];
    this.productosGenerales = [];
    this.recargaForzadaInterna = false;
  }

  /**
   * Recargar productos (método público)
   */
  private recargarProductos(): void {
    console.log('🔄 Recargando productos relacionados...');
    
    this.recargaForzadaInterna = true;
    this.isLoading = true;
    this.productos = [];
    this.productosRelacionados = [];
    this.productosGenerales = [];
    this.error = null;
    this.currentIndex = 0;
    
    // 🔴 IMPORTANTE: Resetear subcategoriaId para que se obtenga la del nuevo producto
    this.subcategoriaId = undefined;
    
    this.cargarProductosRelacionados();
  }

  /**
   * Convertir a ProductoEditable
   */
  private convertirAProductoEditable(producto: any): ProductoEditable {
    if (!producto) {
      // Si el producto es null o undefined, devolver un objeto por defecto
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

  // ===========================
  // MÉTODOS PÚBLICOS Y DE INTERFAZ
  // ===========================

  /**
   * Método público para recargar (usado por el botón de reintento)
   */
  recargar(): void {
    console.log('🔄 Recargando productos relacionados...');
    this.recargarProductos();
  }

  /**
   * Obtener información del producto actual (para depuración)
   */
  getProductoActualInfo(): string {
    return this.productoId 
      ? `ID: ${this.productoId}, Subcategoría: ${this.subcategoriaId || 'N/A'}` 
      : 'No hay producto actual';
  }

  /**
   * Inicializar el carrusel
   */
  private initCarousel(): void {
    const carousel = document.getElementById(this.carouselId);
    if (!carousel || this.productos.length === 0) {
      console.log('⚠️ No se puede inicializar carrusel: sin productos');
      return;
    }

    carousel.scrollLeft = 0;
    carousel.style.scrollBehavior = 'smooth';
    
    console.log('🎠 Carrusel de productos relacionados inicializado');
  }

  /**
   * Calcular items visibles según el tamaño de pantalla
   */
  private calculateVisibleItems(): void {
    const width = window.innerWidth;
    if (width < 768) {
      this.visibleItems = 1;
    } else if (width < 1024) {
      this.visibleItems = 2;
    } else {
      this.visibleItems = 3;
    }
  }

  /**
   * Navegación del carrusel suave
   */
  scrollCarousel(direction: 'prev' | 'next'): void {
    const carousel = document.getElementById(this.carouselId);
    if (!carousel || this.productos.length === 0) {
      console.warn('⚠️ No se encontró el elemento del carrusel');
      return;
    }

    const scrollAmount = carousel.clientWidth * 0.82;
    if (direction === 'prev') {
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  /**
   * Verificar si se puede navegar hacia atrás
   */
  isPrevEnabled(): boolean {
    const carousel = document.getElementById(this.carouselId);
    return carousel ? carousel.scrollLeft > 10 : false;
  }

  /**
   * Verificar si se puede navegar hacia adelante
   */
  isNextEnabled(): boolean {
    const carousel = document.getElementById(this.carouselId);
    return carousel ? carousel.scrollLeft < (carousel.scrollWidth - carousel.clientWidth - 10) : true;
  }

  /**
   * Formatear precio
   */
  formatearPrecio(precio: number): string {
    return this.precioOfertaService.formatearPrecio(precio);
  }

  /**
   * Obtener precio tachado de referencia
   */
  obtenerPrecioReferencia(precioReal: number): string {
    const precioRef = this.precioOfertaService.calcularPrecioReferencia(precioReal, 25);
    return this.precioOfertaService.formatearPrecio(precioRef);
  }

  /**
   * Formatear nombre en Title Case
   */
  formatearNombre(nombre: string): string {
    if (!nombre) return '';
    return nombre
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  /**
   * Obtener URL de imagen del producto optimizada
   */
  getProductoImagen(producto: ProductoEditable): string {
    if (producto?.imagen_url && producto.imagen_url.trim() !== '') {
      return optimizeForThumbnail(producto.imagen_url, 300);
    }
    return 'assets/images/default-product.png';
  }

  /**
   * Manejar error de carga de imagen
   */
  handleImageError(event: Event, producto: ProductoEditable): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn(`⚠️ Error cargando imagen para ${producto?.nombre || 'producto desconocido'}`);
    imgElement.src = 'assets/images/default-product.png';
  }

  /**
   * Generar URL amigable con el slug (SEO)
   */
  getProductoUrl(producto: ProductoEditable): any[] {
    const slug = producto.nombre ? producto.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${producto.id}-${slug}` : producto.id;
    return ['/producto', urlParam];
  }
}