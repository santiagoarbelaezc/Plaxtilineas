import { Component, OnInit, Input, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductosService } from '../../../services/productos.service';
import { ProductSelectService } from '../../../services/product-select.service';
import { ProductoEditable } from '../../../models/producto.model';
import { ProductoMenu } from '../../../models/productoMenu.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-carousel-relacionados',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  templateUrl: './carousel-relacionados.html',
  styleUrls: ['./carousel-relacionados.css']
})
export class CarouselRelacionados implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() subcategoriaId?: number;
  @Input() productoId?: number;
  @Input() productoData?: any;
  @Input() titulo: string = 'Productos relacionados';
  @Input() subtitulo: string = 'Descubre más productos que podrían interesarte';
  @Input() limite: number = 8;
  @Input() usarProductoSeleccionado: boolean = true;
  
  productos: ProductoEditable[] = [];
  productoActual: any = null;
  public carouselId = 'productos-relacionados-carousel';
  isLoading: boolean = false;
  error: string | null = null;
  
  // Variables para el carrusel
  currentIndex = 0;
  visibleItems = 3;

  // Suscripciones
  private productoSeleccionadoSubscription?: Subscription;

  constructor(
    private productosService: ProductosService,
    private productSelectService: ProductSelectService
  ) {}

  ngOnInit(): void {
    console.log('🔄 Iniciando CarouselRelacionados...');
    console.log('📊 Inputs recibidos:', {
      productoId: this.productoId,
      subcategoriaId: this.subcategoriaId,
      productoData: this.productoData,
      usarProductoSeleccionado: this.usarProductoSeleccionado
    });

    if (this.usarProductoSeleccionado) {
      this.suscribirseAProductoSeleccionado();
    } else {
      // Si tenemos datos del producto, extraer la subcategoría
      if (this.productoData) {
        this.extraerDatosDelProducto(this.productoData);
      }
      this.cargarProductosRelacionados();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 Cambios detectados:', changes);
    
    if (!this.usarProductoSeleccionado) {
      // Si cambian los datos del producto, extraer la subcategoría
      if (changes['productoData'] && this.productoData) {
        this.extraerDatosDelProducto(this.productoData);
      }
      
      if (changes['subcategoriaId'] || changes['productoId'] || changes['limite'] || changes['productoData']) {
        this.cargarProductosRelacionados();
      }
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCarousel();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.productoSeleccionadoSubscription) {
      this.productoSeleccionadoSubscription.unsubscribe();
    }
  }

  private suscribirseAProductoSeleccionado(): void {
    console.log('🔍 Suscribiéndose a cambios de producto seleccionado...');
    
    this.productoSeleccionadoSubscription = this.productSelectService.productoSeleccionado$
      .subscribe((producto) => {
        console.log('📱 Producto seleccionado recibido:', producto);
        this.productoActual = producto;
        
        if (producto) {
          console.log('✅ Producto detectado:', {
            nombre: producto.nombre,
            id: producto.id,
            subcategoria_id: producto.subcategoria_id,
            subcategoria: producto.subcategoria
          });
          
          this.productoId = producto.id;
          
          // Extraer la subcategoría del producto
          this.extraerSubcategoriaDeProducto(producto);
          
          this.cargarProductosRelacionados();
        } else {
          console.log('📱 No hay producto seleccionado');
          this.productos = [];
        }
      });
  }

  private extraerSubcategoriaDeProducto(producto: any): void {
    console.log('🔍 Extrayendo subcategoría del producto...');
    
    // Opción 1: Intentar obtener subcategoria_id directamente
    if (producto.subcategoria_id !== undefined && producto.subcategoria_id !== null) {
      this.subcategoriaId = producto.subcategoria_id;
      console.log(`✅ Subcategoría obtenida de subcategoria_id: ${this.subcategoriaId}`);
      return;
    }
    
    // Opción 2: Si solo tenemos el nombre de la subcategoría
    if (producto.subcategoria && typeof producto.subcategoria === 'string') {
      console.log(`ℹ️ Solo tenemos nombre de subcategoría: ${producto.subcategoria}`);
      // Podrías necesitar un mapeo de nombre a ID si es necesario
    }
    
    console.warn('⚠️ No se pudo extraer subcategoria_id del producto');
  }

  private extraerDatosDelProducto(productoData: any): void {
    console.log('🔍 Extrayendo datos del producto input...');
    this.productoActual = productoData;
    
    if (productoData.subcategoria_id !== undefined && productoData.subcategoria_id !== null) {
      this.subcategoriaId = productoData.subcategoria_id;
      console.log(`✅ Subcategoría obtenida: ${this.subcategoriaId}`);
    } else if (productoData.id) {
      this.productoId = productoData.id;
      console.log(`✅ Producto ID obtenido: ${this.productoId}`);
    }
  }

  private cargarProductosRelacionados(): void {
    this.isLoading = true;
    this.error = null;
    
    console.log('🔄 Intentando cargar productos relacionados...');
    console.log('📊 Estado actual:', {
      productoId: this.productoId,
      subcategoriaId: this.subcategoriaId,
      productoActual: this.productoActual
    });

    // Estrategia 1: Si tenemos subcategoriaId, cargar productos de esa subcategoría
    if (this.subcategoriaId) {
      console.log(`🔗 Cargando productos por subcategoría ID: ${this.subcategoriaId}`);
      this.cargarPorSubcategoria();
    }
    // Estrategia 2: Si tenemos productoId pero no subcategoriaId, primero obtener el producto
    else if (this.productoId) {
      console.log(`🔗 Obteniendo producto ID: ${this.productoId} para saber su subcategoría`);
      this.obtenerProductoYSucategorias(this.productoId);
    }
    // Estrategia 3: Si tenemos productoActual, extraer subcategoría de ahí
    else if (this.productoActual?.subcategoria_id) {
      this.subcategoriaId = this.productoActual.subcategoria_id;
      console.log(`🔗 Obteniendo subcategoría del producto actual: ${this.subcategoriaId}`);
      this.cargarPorSubcategoria();
    }
    else {
      console.log('ℹ️ No hay suficiente información para cargar productos relacionados');
      this.manejarError('No hay información suficiente para cargar productos relacionados');
    }
  }

  private obtenerProductoYSucategorias(productoId: number): void {
    this.productosService.obtenerProductoPorId(productoId).subscribe({
      next: (producto) => {
        if (producto) {
          console.log('✅ Producto obtenido:', {
            nombre: producto.nombre,
            subcategoria_id: producto.subcategoria_id
          });
          
          this.productoActual = producto;
          this.subcategoriaId = producto.subcategoria_id;
          
          // Ahora cargar productos de la misma subcategoría
          if (this.subcategoriaId) {
            this.cargarPorSubcategoria();
          } else {
            this.manejarError('El producto no tiene subcategoría asignada');
          }
        } else {
          console.error('❌ Producto no encontrado');
          this.manejarError('No se pudo encontrar el producto');
        }
      },
      error: (err) => {
        console.error('❌ Error al obtener producto:', err);
        this.manejarError('Error al obtener información del producto');
      }
    });
  }

  private cargarPorSubcategoria(): void {
    if (!this.subcategoriaId) {
      this.manejarError('No se especificó una subcategoría');
      return;
    }
    
    console.log(`📦 Cargando productos para subcategoría: ${this.subcategoriaId}`);
    
    this.productosService.obtenerProductosPorSubcategoria(this.subcategoriaId).subscribe({
      next: (productos) => {
        console.log(`✅ Productos por subcategoría obtenidos: ${productos.length}`);
        
        // Excluir el producto actual de la lista si existe
        if (this.productoActual || this.productoId) {
          const idExcluir = this.productoId || (this.productoActual?.id);
          const productosFiltrados = productos.filter(p => p.id !== idExcluir);
          console.log(`🔍 Productos después de filtrar: ${productosFiltrados.length} (excluyendo ID: ${idExcluir})`);
          productos = productosFiltrados;
        }
        
        // Mezclar aleatoriamente y limitar
        const productosAleatorios = this.mezclarArray(productos).slice(0, this.limite);
        
        // Convertir a ProductoEditable
        this.productos = productosAleatorios.map(producto => 
          this.convertirAProductoEditable(producto)
        );
        
        this.calculateVisibleItems();
        this.isLoading = false;
        
        if (this.productos.length === 0) {
          console.log('ℹ️ No se encontraron productos relacionados');
          this.mostrarAlternativas();
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar productos por subcategoría:', err);
        this.manejarError('Error al cargar productos relacionados');
      }
    });
  }

  private mezclarArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private manejarError(mensaje: string): void {
    console.error('❌ Error:', mensaje);
    this.error = mensaje;
    this.isLoading = false;
    this.productos = [];
    
    // Intentar cargar alternativas
    this.mostrarAlternativas();
  }

  private mostrarAlternativas(): void {
    console.log('🔄 Intentando cargar alternativas...');
    
    // Opción 1: Cargar productos aleatorios del historial
    this.cargarDelHistorial();
    
    // Opción 2: Si eso no funciona, cargar productos aleatorios generales
    if (this.productos.length === 0) {
      this.cargarProductosAleatorios();
    }
  }

  private cargarDelHistorial(): void {
    const historial = this.productSelectService.getHistorial();
    
    if (historial.length > 0) {
      let productosHistorial = historial;
      
      // Excluir producto actual si existe
      if (this.productoId || this.productoActual?.id) {
        const idExcluir = this.productoId || this.productoActual?.id;
        productosHistorial = historial.filter(p => p.id !== idExcluir);
      }
      
      if (productosHistorial.length > 0) {
        console.log(`📚 Cargando ${productosHistorial.length} productos del historial`);
        
        const productosAleatorios = this.mezclarArray(productosHistorial).slice(0, this.limite);
        
        this.productos = productosAleatorios.map(producto => ({
          id: producto.id,
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          cantidad: producto.cantidad || 0,
          precio: producto.precio || 0,
          imagen_url: producto.imagen_url || '',
          subcategoria_id: producto.subcategoria_id || 0,
          subcategoria: producto.subcategoria || 'Sin categoría',
          categoria: producto.categoria || 'Sin categoría',
          editando: false,
          nuevaImagen: producto.nuevaImagen
        }));
        
        this.calculateVisibleItems();
        this.error = null;
        console.log(`✅ Alternativas del historial cargadas: ${this.productos.length}`);
      }
    }
  }

  private cargarProductosAleatorios(): void {
    console.log('🎲 Cargando productos aleatorios como última opción...');
    
    this.productosService.obtenerProductosAleatorios(this.limite).subscribe({
      next: (productos) => {
        this.productos = productos.map(producto => 
          this.convertirAProductoEditable(producto)
        );
        this.calculateVisibleItems();
        this.error = null;
        console.log(`✅ Productos aleatorios cargados: ${this.productos.length}`);
      },
      error: (err) => {
        console.error('❌ Error al cargar productos aleatorios:', err);
        this.productos = [];
      }
    });
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
    if (!carousel || this.productos.length === 0) return;

    carousel.scrollLeft = 0;
    carousel.style.scrollBehavior = 'smooth';
    
    console.log('🎠 Carrusel de productos relacionados inicializado');
  }

  // Métodos públicos
  recargar(): void {
    console.log('🔄 Recargando productos relacionados...');
    this.cargarProductosRelacionados();
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
    return this.currentIndex > 0;
  }

  isNextEnabled(): boolean {
    return this.currentIndex < this.productos.length - this.visibleItems;
  }

  getProductoActualInfo(): string {
    if (!this.productoActual) return 'No hay producto seleccionado';
    return `${this.productoActual.nombre} (ID: ${this.productoActual.id}, Subcategoría: ${this.productoActual.subcategoria_id || 'N/A'})`;
  }

  // Método para actualizar manualmente
  actualizarConProducto(producto: ProductoMenu): void {
    console.log('🔄 Actualizando con producto manual:', producto.nombre);
    this.productoActual = producto;
    this.productoId = producto.id;
    this.subcategoriaId = producto.subcategoria_id;
    this.cargarProductosRelacionados();
  }
}