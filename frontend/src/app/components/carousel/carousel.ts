import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ProductoEditable } from '../../models/producto.model';
import { CategoriasService } from '../../services/categorias.service';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.html',
  styleUrls: ['./carousel.css']
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() categoriaNombre: string = 'Pisos'; // Valor por defecto
  
  productos: ProductoEditable[] = [];
  cargando: boolean = true;
  error: string | null = null;
  
  // Configuración del carrusel - CAMBIADO A 4
  currentIndex: number = 0;
  itemsPerView: number = 4; // Cambiado de 3 a 4
  autoSlideInterval: any;
  
  // Configuración de truncado de descripción
  maxDescLength: number = 80; // Reducido un poco para acomodar 4 productos
  
  constructor(
    private categoriasService: CategoriasService,
    private productosService: ProductosService
  ) {}
  
  ngOnInit(): void {
    this.cargarProductosPorCategoria();
    this.iniciarAutoSlide();
  }
  
  ngOnDestroy(): void {
    this.detenerAutoSlide();
  }
  
  cargarProductosPorCategoria(): void {
    this.cargando = true;
    this.error = null;
    this.productos = [];
    
    // 1. Obtener el ID de la categoría por su nombre
    this.categoriasService.getIdCategoriaPorNombre(this.categoriaNombre)
      .subscribe({
        next: (categoria) => {
          // 2. Con el ID, cargar los productos de esa categoría usando el nuevo método
          this.cargarProductosDeCategoria(categoria.id);
        },
        error: (error) => {
          console.error('Error al obtener ID de categoría:', error);
          this.error = `Categoría "${this.categoriaNombre}" no encontrada`;
          this.cargando = false;
        }
      });
  }
  
  cargarProductosDeCategoria(categoriaId: number): void {
    // Usar el nuevo método que filtra por categoría ID
    this.productosService.obtenerProductosPorCategoriaId(categoriaId)
      .subscribe({
        next: (productos) => {
          this.productos = productos || [];
          this.cargando = false;
          
          console.log(`Productos cargados para categoría ${this.categoriaNombre} (ID: ${categoriaId}):`, this.productos.length);
          
          // Verificar si realmente son de la categoría correcta
          if (this.productos.length > 0) {
            // Opcional: verificar que los productos pertenezcan a la categoría
            const productosFiltrados = this.filtrarProductosPorCategoria(this.productos, this.categoriaNombre);
            
            if (productosFiltrados.length < this.productos.length) {
              console.warn(`Algunos productos no pertenecen a la categoría "${this.categoriaNombre}"`);
              this.productos = productosFiltrados;
            }
          }
          
          // Si no hay productos, mostrar mensaje
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
  
  // Método auxiliar para filtrar productos por categoría (por si el backend no filtra correctamente)
  filtrarProductosPorCategoria(productos: ProductoEditable[], nombreCategoria: string): ProductoEditable[] {
    // Verificar si los productos tienen la propiedad 'categoria' para filtrar
    return productos.filter(producto => {
      // Si el producto tiene la propiedad 'categoria', compararla
      if (producto.categoria) {
        return producto.categoria.toLowerCase() === nombreCategoria.toLowerCase();
      }
      // Si no tiene la propiedad, asumimos que sí pertenece
      return true;
    });
  }
  
  // Navegación del carrusel - Actualizado para 4 productos
  next(): void {
    if (this.productos.length <= this.itemsPerView) return;
    
    const maxIndex = Math.max(0, this.productos.length - this.itemsPerView);
    
    if (this.currentIndex + 1 <= maxIndex) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0; // Volver al inicio
    }
  }
  
  prev(): void {
    if (this.productos.length <= this.itemsPerView) return;
    
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      // Ir al final
      const maxIndex = Math.max(0, this.productos.length - this.itemsPerView);
      this.currentIndex = maxIndex;
    }
  }
  
  goToSlide(index: number): void {
    const maxIndex = Math.max(0, this.productos.length - this.itemsPerView);
    if (index >= 0 && index <= maxIndex) {
      this.currentIndex = index;
    }
  }
  
  // Auto-slide
  iniciarAutoSlide(): void {
    this.detenerAutoSlide();
    this.autoSlideInterval = setInterval(() => {
      if (this.productos.length > this.itemsPerView) {
        this.next();
      }
    }, 5000); // Cambia cada 5 segundos
  }
  
  detenerAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }
  
  // Métodos auxiliares
  get visibleProducts(): ProductoEditable[] {
    return this.productos.slice(this.currentIndex, this.currentIndex + this.itemsPerView);
  }
  
  get totalSlides(): number {
    return Math.max(1, this.productos.length - this.itemsPerView + 1);
  }
  
  getSlideIndices(): number[] {
    return Array.from({ length: this.totalSlides }, (_, i) => i);
  }
  
  onMouseEnter(): void {
    this.detenerAutoSlide();
  }
  
  onMouseLeave(): void {
    this.iniciarAutoSlide();
  }
  
 // Método para formatear precio sin decimales (versión concisa)
formatearPrecio(precio: number): string {
  return '$ ' + Math.round(precio).toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}
  
  // Método para truncar la descripción
  truncarDescripcion(descripcion: string): string {
    if (!descripcion) return '';
    
    if (descripcion.length <= this.maxDescLength) {
      return descripcion;
    }
    
    return descripcion.substring(0, this.maxDescLength) + '...';
  }
}