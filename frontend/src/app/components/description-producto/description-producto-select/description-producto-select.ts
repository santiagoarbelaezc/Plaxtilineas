// description-producto-select.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductoMenu } from '../../../models/productoMenu.model';
import { Variante } from '../../../models/variante.model';
import { ProductSelectService } from '../../../services/product-select.service';
import { ProductosService } from '../../../services/productos.service';
import { VariantesService } from '../../../services/variantes.service';
import { CarouselSignalService } from '../../../services/carousel-signal.service'; // Importar el nuevo servicio

@Component({
  selector: 'app-description-producto-select',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './description-producto-select.html',
  styleUrls: ['./description-producto-select.css']
})
export class DescriptionProductoSelect implements OnInit, OnDestroy {
  producto: ProductoMenu | null = null;
  cargando = true;
  error = false;
  
  variantes: Variante[] = [];
  varianteSeleccionada: Variante | null = null;
  descripcionBase: string = '';
  productoBaseNombre: string = '';
  
  // Propiedades para el modal de imagen
  mostrarModalImagen = false;
  imagenModalUrl: string = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    public productSelectService: ProductSelectService,
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private variantesService: VariantesService,
    private carouselSignalService: CarouselSignalService // Inyectar el servicio
  ) {}

  ngOnInit() {
    // Escuchar cambios en los parámetros de la ruta
    this.subscriptions.push(
      this.route.params.subscribe(params => {
        const productId = +params['id'];
        if (productId) {
          this.cargarProducto(productId);
        }
      })
    );

    // También escuchar producto seleccionado del servicio
    this.subscriptions.push(
      this.productSelectService.productoSeleccionado$.subscribe(
        (producto) => {
          if (producto) {
            this.producto = producto as any;
            this.procesarProducto();
            this.cargando = false;
            this.error = false;
            
            // 🚨 EMITIR SEÑAL cuando se selecciona un producto desde el servicio
            this.carouselSignalService.notificarProductoSeleccionado(producto.id);
          }
        }
      )
    );

    // Restaurar historial
    this.productSelectService.restaurarHistorial();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private cargarProducto(id: number) {
    this.cargando = true;
    this.error = false;
    
    // 1. Intentar obtener el producto del estado de navegación
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['producto']) {
      this.producto = navigation.extras.state['producto'] as ProductoMenu;
      this.procesarProducto();
      this.cargando = false;
      
      // 🚨 EMITIR SEÑAL cuando se carga un producto desde el estado de navegación
      this.carouselSignalService.notificarProductoSeleccionado(this.producto.id);
      return;
    }
    
    // 2. Usar fetch directamente para obtener el producto
    fetch(`/api/productos/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Producto no encontrado');
        }
        return response.json();
      })
      .then(data => {
        // Convertir datos del backend al tipo ProductoMenu
        const productoConvertido: any = {
          id: data.id,
          nombre: data.nombre,
          descripcion: data.descripcion,
          cantidad: data.cantidad || 0,
          precio: typeof data.precio === 'string' ? parseFloat(data.precio) : data.precio,
          imagen_url: data.imagen_url,
          subcategoria_id: data.subcategoria_id,
          subcategoria: data.subcategoria,
          categoria: data.categoria
        };
        
        // Agregar campos adicionales si existen
        if (data.public_id) productoConvertido.public_id = data.public_id;
        if (data.creado_en) productoConvertido.creado_en = data.creado_en;
        if (data.categoria_icono) productoConvertido.categoria_icono = data.categoria_icono;
        
        this.producto = productoConvertido;
        this.procesarProducto();
        
        if (this.producto) {
          this.productSelectService.seleccionarProducto(this.producto);
          
          // 🚨 EMITIR SEÑAL después de seleccionar el producto
          this.carouselSignalService.notificarProductoSeleccionado(this.producto.id);
        }
        this.cargando = false;
      })
      .catch(error => {
        console.error('Error al cargar producto:', error);
        this.error = true;
        this.cargando = false;
      });
  }

  /**
   * Procesa el producto para cargar variantes y establecer información base
   */
  private procesarProducto() {
    if (!this.producto) return;
    
    // Establecer nombre base
    this.productoBaseNombre = this.producto.nombre || '';
    
    // Establecer descripción base
    this.descripcionBase = this.producto.descripcion || '';
    
    // Cargar variantes del producto
    this.cargarVariantesProducto(this.producto.id);
  }

  /**
   * Carga las variantes del producto usando el servicio
   */
  private cargarVariantesProducto(productoId: number) {
    this.variantesService.getVariantesPorProducto(productoId)
      .subscribe({
        next: (variantes) => {
          this.variantes = variantes;
          
          // Seleccionar la primera variante por defecto si existe
          if (this.variantes.length > 0) {
            this.varianteSeleccionada = this.variantes[0];
          } else {
            this.varianteSeleccionada = null;
          }
        },
        error: (error) => {
          console.error('Error al cargar variantes:', error);
          this.variantes = [];
          this.varianteSeleccionada = null;
        }
      });
  }

  /**
   * Selecciona una variante del producto
   */
  seleccionarVariante(variante: Variante) {
    this.varianteSeleccionada = variante;
  }

  /**
   * Obtiene el precio actual basado en la variante seleccionada
   */
  get precioActual(): number {
    if (this.varianteSeleccionada) {
      return this.varianteSeleccionada.precio;
    }
    return this.producto?.precio || 0;
  }

  /**
   * Obtiene el nombre completo (producto + variante)
   */
  get nombreCompleto(): string {
    if (this.varianteSeleccionada) {
      return `${this.productoBaseNombre} - ${this.varianteSeleccionada.nombre}`;
    }
    return this.productoBaseNombre;
  }

  // Método para generar el enlace de WhatsApp con la variante seleccionada
  generarWhatsAppLink(): string {
    if (!this.producto) return '';
    
    const numeroWhatsApp = '+573006680125';
    const nombreCompleto = this.nombreCompleto;
    
    let mensaje = `Hola, estoy interesado en el siguiente producto de Plaxtilineas:\n\n` +
                 `*${nombreCompleto}*\n` +
                 `Código: ${this.producto.id}\n`;
    
    // Añadir información de la variante seleccionada
    if (this.varianteSeleccionada) {
      mensaje += `Variante: ${this.varianteSeleccionada.nombre}\n`;
    }
    
    mensaje += `Descripción: ${this.descripcionBase}\n` +
               `Categoría: ${this.producto.categoria}\n` +
               `Subcategoría: ${this.producto.subcategoria}\n` +
               `Precio: $${this.formatearPrecio(this.precioActual)}\n\n` +
               `¿Podrían darme más información sobre disponibilidad y características?`;
    
    const mensajeCodificado = encodeURIComponent(mensaje);
    return `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
  }

  // Método para formatear fecha
  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    
    try {
      const fechaObj = typeof fecha === 'string' ? new Date(fecha) : new Date();
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '';
    }
  }

  volverAProductos() {
    this.router.navigate(['/productos'], {
      queryParamsHandling: 'preserve'
    });
  }

  verMasDeEstaCategoria() {
    if (this.producto?.categoria) {
      this.router.navigate(['/productos'], {
        queryParams: { categoria: this.producto.categoria }
      });
    }
  }

  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    
    // Redondear el precio a entero si tiene decimales
    const precioEntero = Math.round(precio);
    
    // Formatear sin decimales
    const precioFormateado = precioEntero.toLocaleString('es-ES');
    
    return `$ ${precioFormateado}`;
}

  getHistorialProductos(): ProductoMenu[] {
    return this.productSelectService.getHistorial();
  }

  tieneProductosRelacionadosEnHistorial(): boolean {
    const historial = this.getHistorialProductos();
    return historial.filter(p => p.id !== this.producto?.id).length > 0;
  }
  
  verDetallesProducto(producto: ProductoMenu) {
    // 🚨 EMITIR SEÑAL antes de navegar
    this.carouselSignalService.notificarProductoSeleccionado(producto.id);
    
    // Llamar al servicio para manejar la navegación
    this.productSelectService.verDetallesProducto(producto);
  }

  // Métodos para el modal de imagen
  abrirModalImagen() {
    if (this.producto?.imagen_url) {
      this.imagenModalUrl = this.producto.imagen_url;
      this.mostrarModalImagen = true;
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
    }
  }

  cerrarModalImagen() {
    this.mostrarModalImagen = false;
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
  }

  // Cerrar modal con tecla Esc
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.mostrarModalImagen) {
      this.cerrarModalImagen();
    }
  }
}