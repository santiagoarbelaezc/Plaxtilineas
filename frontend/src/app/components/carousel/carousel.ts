import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, HostListener, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight, faPlus } from '@fortawesome/free-solid-svg-icons';
import { ProductoEditable } from '../../models/producto.model';
import { CategoriasService } from '../../services/categorias.service';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './carousel.html',
  styleUrls: ['./carousel.css']
})
export class CarouselComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() categoriaNombre: string = 'Pisos'; // Valor por defecto
  
  productos: ProductoEditable[] = [];
  cargando: boolean = true;
  error: string | null = null;
  
  // Configuración del carrusel
  currentIndex: number = 0;
  itemsPerView: number = 4; // Por defecto para desktop
  autoSlideInterval: any;
  
  // Configuración de truncado de descripción
  maxDescLength: number = 120;
  
  // Variables para responsive
  screenWidth: number = window.innerWidth;
  isMobile: boolean = false;
  isTablet: boolean = false;
  
  constructor(
    private categoriasService: CategoriasService,
    private productosService: ProductosService,
    private router: Router,
    library: FaIconLibrary
  ) {
    library.addIcons(faChevronLeft, faChevronRight, faPlus);
    this.detectDeviceType();
    this.updateItemsPerView();
  }
  
  ngOnInit(): void {
    this.cargarProductosPorCategoria();
    this.iniciarAutoSlide();
  }
  
  ngAfterViewInit(): void {
    // Asegurar que el responsive se aplique después de la renderización inicial
    setTimeout(() => {
      this.updateItemsPerView();
      this.adjustCurrentIndex();
    }, 100);
  }
  
  ngOnDestroy(): void {
    this.detenerAutoSlide();
  }
  
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.screenWidth = window.innerWidth;
    this.detectDeviceType();
    this.updateItemsPerView();
    // Resetear el índice actual si es necesario
    this.adjustCurrentIndex();
  }
  
  // Detectar tipo de dispositivo
  detectDeviceType(): void {
    this.isMobile = this.screenWidth < 768;
    this.isTablet = this.screenWidth >= 768 && this.screenWidth < 1024;
  }
  
  // Método para actualizar itemsPerView según el tamaño de pantalla
  updateItemsPerView(): void {
    if (this.screenWidth < 480) {
      this.itemsPerView = 1; // Móvil pequeño (xs)
    } else if (this.screenWidth < 640) {
      this.itemsPerView = 1; // Móvil (sm)
    } else if (this.screenWidth < 768) {
      this.itemsPerView = 1; // Móvil grande/Tablet pequeña (md)
    } else if (this.screenWidth < 1024) {
      this.itemsPerView = 3; // Tablet (lg)
    } else if (this.screenWidth < 1280) {
      this.itemsPerView = 4; // Desktop (xl)
    } else {
      this.itemsPerView = 4; // Desktop grande (2xl)
    }
    
    // Actualizar el máximo de caracteres según tamaño
    if (this.screenWidth < 480) {
      this.maxDescLength = 60;
    } else if (this.screenWidth < 640) {
      this.maxDescLength = 80;
    } else if (this.screenWidth < 768) {
      this.maxDescLength = 100;
    } else if (this.screenWidth < 1024) {
      this.maxDescLength = 120;
    } else {
      this.maxDescLength = 140;
    }
  }
  
  // Ajustar currentIndex para que no exceda el máximo
  adjustCurrentIndex(): void {
    const maxIndex = this.productos.length > this.itemsPerView 
      ? Math.max(0, this.productos.length - this.itemsPerView)
      : 0;
    
    if (this.currentIndex > maxIndex) {
      this.currentIndex = maxIndex;
    }
  }
  
  cargarProductosPorCategoria(): void {
    this.cargando = true;
    this.error = null;
    this.productos = [];
    
    this.categoriasService.getIdCategoriaPorNombre(this.categoriaNombre)
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.categoria) {
            this.cargarProductosDeCategoria(response.categoria.id);
          } else {
            this.error = `Categoría "${this.categoriaNombre}" no encontrada`;
            this.cargando = false;
          }
        },
        error: (error) => {
          console.error('Error al obtener ID de categoría:', error);
          this.error = `Categoría "${this.categoriaNombre}" no encontrada`;
          this.cargando = false;
        }
      });
  }
  
  cargarProductosDeCategoria(categoriaId: number): void {
    this.productosService.obtenerProductosPorCategoriaId(categoriaId)
      .subscribe({
        next: (productos) => {
          this.productos = productos || [];
          this.cargando = false;
          
          // Ajustar índice después de cargar productos
          this.adjustCurrentIndex();
          
          console.log(`Productos cargados: ${this.productos.length}, itemsPerView: ${this.itemsPerView}`);
          
          if (this.productos.length > 0) {
            const productosFiltrados = this.filtrarProductosPorCategoria(this.productos, this.categoriaNombre);
            
            if (productosFiltrados.length < this.productos.length) {
              this.productos = productosFiltrados;
            }
          }
          
          if (this.productos.length === 0) {
            this.error = `No hay productos disponibles en la categoría "${this.categoriaNombre}"`;
          }
        },
        error: (error) => {
          console.error('Error al cargar productos:', error);
          this.error = `No se pudieron cargar los productos de "${this.categoriaNombre}"`;
          this.cargando = false;
        }
      });
  }
  
  filtrarProductosPorCategoria(productos: ProductoEditable[], nombreCategoria: string): ProductoEditable[] {
    return productos.filter(producto => {
      if (producto.categoria) {
        return producto.categoria.toLowerCase() === nombreCategoria.toLowerCase();
      }
      return true;
    });
  }
  
  // TrackBy para mejorar performance en ngFor
  trackByProductId(index: number, producto: ProductoEditable): number {
    return producto.id || index;
  }
  
  // Navegación del carrusel
  
  goToSlide(index: number): void {
    const maxIndex = Math.max(0, this.productos.length - this.itemsPerView);
    if (index >= 0 && index <= maxIndex) {
      this.currentIndex = index;
    }
  }
  
  // Auto-slide (solo en desktop)
  iniciarAutoSlide(): void {
    this.detenerAutoSlide();
    
    // Solo activar auto-slide en desktop
    if (this.screenWidth >= 768 && this.productos.length > this.itemsPerView) {
      this.autoSlideInterval = setInterval(() => {
        this.next();
      }, 5000);
    }
  }
  
  detenerAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }
  
  // Métodos auxiliares
  get visibleProducts(): ProductoEditable[] {
    return this.productos.slice(this.currentIndex, this.currentIndex + this.itemsPerView);
  }
  
  get totalSlides(): number {
    return Math.max(1, Math.ceil(this.productos.length / this.itemsPerView));
  }
  
  getSlideIndices(): number[] {
    const total = this.totalSlides;
    const maxIndicesToShow = this.isMobile ? 3 : 5; // Mostrar menos indicadores en móvil
    const indices = [];
    
    // Calcular rango de índices a mostrar
    let start = Math.max(0, this.currentIndex - Math.floor(maxIndicesToShow / 2));
    let end = Math.min(total - 1, start + maxIndicesToShow - 1);
    
    // Ajustar si estamos cerca del inicio
    if (end - start + 1 < maxIndicesToShow) {
      start = Math.max(0, end - maxIndicesToShow + 1);
    }
    
    for (let i = start; i <= end && i < total; i++) {
      indices.push(i);
    }
    
    return indices;
  }
  
  onMouseEnter(): void {
    this.detenerAutoSlide();
  }
  
  onMouseLeave(): void {
    this.iniciarAutoSlide();
  }
  
  // Manejo de touch para móviles
  touchStartX: number = 0;
  touchEndX: number = 0;
  
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.detenerAutoSlide();
  }
  
  onTouchMove(event: TouchEvent): void {
    this.touchEndX = event.touches[0].clientX;
  }
  
  onTouchEnd(): void {
    const threshold = 50; // Mínimo desplazamiento para considerar un swipe
    
    if (this.touchStartX - this.touchEndX > threshold) {
      // Swipe izquierda -> siguiente
      this.next();
    } else if (this.touchEndX - this.touchStartX > threshold) {
      // Swipe derecha -> anterior
      this.prev();
    }
    
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.iniciarAutoSlide();
  }
  
  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${precioFormateado}`;
  }
  
  truncarDescripcion(descripcion: string): string {
    if (!descripcion) return '';
    
    if (descripcion.length <= this.maxDescLength) {
      return descripcion;
    }
    
    return descripcion.substring(0, this.maxDescLength) + '...';
  }
  
  @ViewChild('carouselViewport') carouselViewport!: ElementRef;

  isAtStart: boolean = true;
  isAtEnd: boolean = false;
  scrollProgress: number = 0;

  // New Methods for Native Scrolling
  onScroll(): void {
    if (!this.carouselViewport) return;
    
    const el = this.carouselViewport.nativeElement;
    const maxScroll = el.scrollWidth - el.clientWidth;
    
    if (maxScroll <= 0) {
      this.scrollProgress = 100;
      this.isAtStart = true;
      this.isAtEnd = true;
      return;
    }
    
    this.scrollProgress = (el.scrollLeft / maxScroll) * 100;
    this.isAtStart = el.scrollLeft <= 0;
    this.isAtEnd = el.scrollLeft >= maxScroll - 1; // 1px threshold for fractional pixels
  }

  onWheel(event: WheelEvent): void {
    // Solo manejamos scroll horizontal si el usuario usa Shift + rueda o gesto lateral del trackpad
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      if (this.carouselViewport) {
        const el = this.carouselViewport.nativeElement;
        const delta = event.shiftKey ? event.deltaY : event.deltaX;
        if (delta !== 0) {
          event.preventDefault();
          this.detenerAutoSlide();
          el.scrollBy({
            left: delta * 0.75,
            behavior: 'auto'
          });
        }
      }
    }
    // Si es scroll vertical normal (sin Shift), permitimos que la página navegue con total fluidez sin atrapar el scroll
  }

  moveNext(): void {
    if (!this.carouselViewport) return;
    const itemWidth = 240; // 220px width + 20px gap
    this.carouselViewport.nativeElement.scrollBy({ left: itemWidth * this.itemsPerView, behavior: 'smooth' });
  }

  movePrev(): void {
    if (!this.carouselViewport) return;
    const itemWidth = 240;
    this.carouselViewport.nativeElement.scrollBy({ left: -(itemWidth * this.itemsPerView), behavior: 'smooth' });
  }

  next(): void {
    if (!this.carouselViewport) return;
    
    const el = this.carouselViewport.nativeElement;
    const maxScroll = el.scrollWidth - el.clientWidth;
    
    if (el.scrollLeft >= maxScroll - 1) {
      // Loop back to start
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      this.moveNext();
    }
  }

  prev(): void {
    if (!this.carouselViewport) return;
    
    const el = this.carouselViewport.nativeElement;
    
    if (el.scrollLeft <= 0) {
      // Loop to end
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollTo({ left: maxScroll, behavior: 'smooth' });
    } else {
      this.movePrev();
    }
  }
}