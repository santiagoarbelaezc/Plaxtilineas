import { Component, OnInit, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductosService } from '../../../services/productos.service';
import { ProductoEditable } from '../../../models/producto.model';
import { CarouselSignalService } from '../../../services/carousel-signal.service';

@Component({
  selector: 'app-carousel-interes',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  templateUrl: './carousel-interes.html',
  styleUrls: ['./carousel-interes.css']
})
export class CarouselInteres implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() titulo: string = 'Productos que podrían interesarte';
  @Input() subtitulo: string = 'Descubre productos seleccionados especialmente para ti';
  @Input() limite: number = 16;
  @Input() excluirProductoId?: number;
  @Input() forzarRecarga: boolean = false;
  
  productos: ProductoEditable[] = [];
  public carouselId = 'productos-interes-carousel';
  isLoading: boolean = false;
  error: string | null = null;
  
  // Variables para el carrusel
  currentIndex = 0;
  visibleItems = 4;

  // Para almacenar timestamp de última carga y evitar cargas muy frecuentes
  private ultimaCarga: number = 0;
  private readonly MIN_TIEMPO_ENTRE_CARGAS = 30000; // 30 segundos mínimo entre recargas automáticas

  // Suscripción a las señales
  private signalSubscription?: Subscription;

  // Flag interno para controlar recargas forzadas
  private recargaForzadaInterna = false;

  constructor(
    private productosService: ProductosService,
    private carouselSignalService: CarouselSignalService
  ) {}

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
    
    // 🎯 SUSCRIBIRSE a las señales de producto seleccionado
    this.suscribirASeñales();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia el parámetro forzarRecarga o excluirProductoId, recargar
    if (changes['forzarRecarga'] || changes['excluirProductoId'] || changes['limite']) {
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
    // Limpiar suscripciones
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
        
        // Actualizar el producto a excluir
        if (productoId > 0) {
          this.excluirProductoId = productoId;
        }
        
        // Forzar recarga del carrusel
        this.recargarProductos();
      });
  }

  /**
   * Método para recargar productos cuando se recibe una señal
   */
  private recargarProductos(): void {
    console.log('🔄 Recargando carrusel por señal...');
    
    // Activar flag de recarga forzada
    this.recargaForzadaInterna = true;
    
    // Resetear estado
    this.isLoading = true;
    this.productos = [];
    this.error = null;
    this.currentIndex = 0;
    
    // Cargar nuevos productos
    this.cargarProductosAleatorios();
  }

  private cargarProductosAleatorios(): void {
    const ahora = Date.now();
    
    // Aplicar condición de tiempo solo si NO es una recarga forzada
    const esRecargaForzada = this.forzarRecarga || this.recargaForzadaInterna;
    
    if (!esRecargaForzada && (ahora - this.ultimaCarga) < this.MIN_TIEMPO_ENTRE_CARGAS) {
      console.log('⏱️  Carga evitada: tiempo mínimo entre cargas no alcanzado');
      console.log(`⏰ Última carga: ${new Date(this.ultimaCarga).toLocaleTimeString()}`);
      console.log(`⏰ Ahora: ${new Date(ahora).toLocaleTimeString()}`);
      console.log(`⏳ Diferencia: ${(ahora - this.ultimaCarga) / 1000} segundos`);
      
      // Si ya tenemos productos, no mostrar estado de carga
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
    
    // Aumentar el límite para tener más productos para aleatorizar
    const limiteParaSolicitud = Math.max(this.limite * 2, 16);
    
    this.productosService.obtenerProductosAleatorios(limiteParaSolicitud).subscribe({
      next: (productos) => {
        console.log(`✅ Productos aleatorios obtenidos: ${productos.length}`);
        
        // Procesar los productos
        this.procesarProductos(productos);
        
        // Resetear flag de recarga forzada después de cargar
        this.recargaForzadaInterna = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar productos aleatorios:', err);
        this.manejarError('Error al cargar productos de interés');
        
        // Resetear flag de recarga forzada en caso de error también
        this.recargaForzadaInterna = false;
      },
      complete: () => {
        console.log('✅ Carga de productos completada');
      }
    });
  }

  private procesarProductos(productos: any[]): void {
    console.log(`🔍 Procesando ${productos.length} productos...`);
    
    // 1. Excluir producto específico si se especificó
    if (this.excluirProductoId && productos.length > 0) {
      const productosAntes = productos.length;
      productos = productos.filter(p => p.id !== this.excluirProductoId);
      console.log(`🔍 Productos después de excluir ID ${this.excluirProductoId}: ${productosAntes} → ${productos.length}`);
    }
    
    // 2. Aleatorizar los productos
    const productosAleatorizados = this.mezclarArrayAleatoriamente(productos);
    
    // 3. Tomar solo el límite solicitado
    const productosFinales = productosAleatorizados.slice(0, this.limite);
    
    console.log(`🎯 Productos finales después de aleatorizar: ${productosFinales.length}`);
    
    // 4. Convertir a ProductoEditable
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
    this.calculateVisibleItems();
    this.isLoading = false;
    
    if (this.productos.length > 0) {
      console.log(`🎉 ${this.productos.length} productos cargados exitosamente`);
      
      // Inicializar carrusel después de cargar
      setTimeout(() => {
        this.initCarousel();
      }, 100);
    } else {
      console.log('ℹ️ Carrusel vacío después de finalizar carga');
    }
  }

  private manejarError(mensaje: string): void {
    console.error('❌ Error:', mensaje);
    this.error = mensaje;
    this.isLoading = false;
    this.productos = [];
  }


  /**
   * Mezcla un array de forma aleatoria usando el algoritmo Fisher-Yates
   */
  private mezclarArrayAleatoriamente<T>(array: T[]): T[] {
    console.log('🔀 Mezclando array aleatoriamente...');
    
    // Crear una copia para no modificar el original
    const mezclado = [...array];
    
    // Algoritmo Fisher-Yates shuffle
    for (let i = mezclado.length - 1; i > 0; i--) {
      // Generar índice aleatorio entre 0 e i
      const j = Math.floor(Math.random() * (i + 1));
      
      // Intercambiar elementos
      [mezclado[i], mezclado[j]] = [mezclado[j], mezclado[i]];
    }
    
    return mezclado;
  }

  /**
   * Intenta cargar productos alternativos si no hay suficientes
   */
  private intentarCargaAlternativa(): void {
    console.log('🔄 Intentando carga alternativa...');
    
    // Si no hay productos después de excluir, intentar sin excluir
    if (this.excluirProductoId) {
      console.log('🔄 Reintentando sin excluir producto...');
      this.excluirProductoId = undefined;
      this.cargarProductosAleatorios();
    } else {
      // Si aún no hay productos, mostrar mensaje
      this.error = 'No hay productos disponibles en este momento';
    }
  }

  /**
   * Método para obtener productos con rotación basada en timestamp
   */
  private obtenerProductosConRotacion(): void {
    const ahora = Date.now();
    
    // Usar timestamp para "rotar" qué productos mostrar
    // Esto crea un efecto de que los productos cambian con el tiempo
    const seed = Math.floor(ahora / (1000 * 60 * 5)); // Cambia cada 5 minutos
    
    console.log(`⏰ Seed de rotación: ${seed} (cambia cada 5 minutos)`);
    
    this.isLoading = true;
    this.error = null;
    
    // Solicitar más productos para tener variedad
    const limiteAmpliado = this.limite * 3;
    
    this.productosService.obtenerProductosAleatorios(limiteAmpliado).subscribe({
      next: (productos) => {
        console.log(`✅ ${productos.length} productos recibidos para rotación`);
        
        // Excluir producto específico
        if (this.excluirProductoId) {
          productos = productos.filter(p => p.id !== this.excluirProductoId);
        }
        
        // Seleccionar productos basados en el seed de rotación
        const productosSeleccionados = this.seleccionarConRotacion(productos, seed);
        
        this.productos = productosSeleccionados.map(producto => 
          this.convertirAProductoEditable(producto)
        );
        
        this.finalizarCarga();
      },
      error: (err) => {
        console.error('❌ Error en carga con rotación:', err);
        this.manejarError('Error al cargar productos');
      }
    });
  }

  /**
   * Selecciona productos usando una semilla para rotación
   */
  private seleccionarConRotacion(productos: any[], seed: number): any[] {
    if (productos.length <= this.limite) {
      return productos;
    }
    
    // Crear un array de índices
    const indices = Array.from({ length: productos.length }, (_, i) => i);
    
    // Mezclar usando la semilla como random seed
    const indicesMezclados = this.mezclarConSemilla(indices, seed);
    
    // Tomar los primeros 'limite' índices
    const indicesSeleccionados = indicesMezclados.slice(0, this.limite);
    
    // Obtener los productos correspondientes
    return indicesSeleccionados.map(index => productos[index]);
  }

  /**
   * Mezcla un array usando una semilla para ser determinista
   */
  private mezclarConSemilla<T>(array: T[], seed: number): T[] {
    // Crear una copia
    const mezclado = [...array];
    
    // Pseudo-random generator con seed
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    
    // Fisher-Yates con generador pseudo-aleatorio
    for (let i = mezclado.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [mezclado[i], mezclado[j]] = [mezclado[j], mezclado[i]];
    }
    
    return mezclado;
  }

 // Métodos públicos
  recargar(): void {
    console.log('🔄 Recargando productos de interés...');
    this.recargaForzadaInterna = true;
    this.cargarProductosAleatorios();
  }
  // Método para convertir cualquier producto a ProductoEditable
  private convertirAProductoEditable(producto: any): ProductoEditable {
    return {
      id: producto.id,
      nombre: producto.nombre,
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

  private initCarousel(): void {
    const carousel = document.getElementById(this.carouselId);
    if (!carousel || this.productos.length === 0) {
      console.log('⚠️ No se puede inicializar carrusel: sin productos');
      return;
    }

    carousel.scrollLeft = 0;
    carousel.style.scrollBehavior = 'smooth';
    
    console.log('🎠 Carrusel de productos de interés inicializado');
  }

  

  recargarConRotacion(): void {
    console.log('🔄 Recargando con rotación...');
    this.obtenerProductosConRotacion();
  }

  scrollCarousel(direction: 'prev' | 'next'): void {
    const carousel = document.getElementById(this.carouselId);
    if (!carousel || this.productos.length === 0) {
      console.warn('⚠️ No se encontró el elemento del carrusel de productos');
      return;
    }

    const itemWidth = this.getItemWidth();
    const scrollAmount = itemWidth * this.visibleItems;
    const currentScroll = carousel.scrollLeft;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    let newScroll: number;
    let newIndex: number;

    if (direction === 'next') {
      newScroll = Math.min(currentScroll + scrollAmount, maxScroll);
      newIndex = Math.min(
        this.currentIndex + this.visibleItems,
        this.productos.length - this.visibleItems
      );
    } else {
      newScroll = Math.max(currentScroll - scrollAmount, 0);
      newIndex = Math.max(this.currentIndex - this.visibleItems, 0);
    }

    carousel.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });

    this.currentIndex = newIndex;
    console.log(`🔄 Carrusel desplazado a: ${direction}, índice: ${this.currentIndex}`);
  }

  private getItemWidth(): number {
    return 320;
  }

  getProductoImagen(producto: ProductoEditable): string {
    if (producto.imagen_url && producto.imagen_url.trim() !== '') {
      return producto.imagen_url;
    }
    return 'assets/images/default-product.png';
  }

  handleImageError(event: Event, producto: ProductoEditable): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn(`⚠️ Error cargando imagen para ${producto.nombre}`);
    imgElement.src = 'assets/images/default-product.png';
  }

  isPrevEnabled(): boolean {
    const carousel = document.getElementById(this.carouselId);
    return carousel ? carousel.scrollLeft > 0 : false;
  }

  /**
   * Verificar si se puede navegar hacia adelante
   */
  isNextEnabled(): boolean {
    const carousel = document.getElementById(this.carouselId);
    return carousel ? carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth : false;
  }

  /**
   * Obtiene una nueva selección de productos (para rotación manual)
   */
  rotarProductos(): void {
    console.log('🔄 Rotando productos manualmente...');
    
    if (this.productos.length <= 1) {
      console.log('⚠️ No hay suficientes productos para rotar');
      return;
    }
    
    // Rotar el array: mover el primer elemento al final
    const rotados = [...this.productos.slice(1), this.productos[0]];
    this.productos = rotados;
    
    console.log('✅ Productos rotados manualmente');
    
    // Resetear carrusel
    const carousel = document.getElementById(this.carouselId);
    if (carousel) {
      carousel.scrollLeft = 0;
      this.currentIndex = 0;
    }
  }
}