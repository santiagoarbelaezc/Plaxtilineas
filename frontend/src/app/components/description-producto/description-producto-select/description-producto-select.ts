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
import { MenuStateService } from '../../../services/menu-state.service';
import { CarouselSignalService } from '../../../services/carousel-signal.service';
import { PrecioCantidadService } from '../../../services/precio-cantidad.service';

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

  zoomX = 0;
  zoomY = 0;
  
  // Propiedades para cantidad y precio
  cantidadSeleccionada: number = 1;
  opcionesCantidad: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  precioConCantidad: number = 0;
  
  // Propiedades para el modal de imagen
  mostrarModalImagen = false;
  imagenModalUrl: string = '';
  
  // Propiedad para el modal de descripción
  mostrarModalDescripcion = false;
  
  // Propiedad para el mensaje de enlace copiado
  enlaceCopiado = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    public productSelectService: ProductSelectService,
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private variantesService: VariantesService,
    private menuStateService: MenuStateService,
    private carouselSignalService: CarouselSignalService,
    private precioCantidadService: PrecioCantidadService
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
    
    // 2. Usar el servicio ProductosService para obtener el producto
    this.productosService.obtenerProductoPorId(id).subscribe({
      next: (productoData) => {
        if (productoData) {
          // Convertir ProductoEditable a ProductoMenu
          const productoConvertido: ProductoMenu = this.convertirProductoEditableAMenu(productoData);
          
          this.producto = productoConvertido;
          this.procesarProducto();
          
          this.productSelectService.seleccionarProducto(this.producto);
          
          // 🚨 EMITIR SEÑAL después de seleccionar el producto
          this.carouselSignalService.notificarProductoSeleccionado(this.producto.id);
        } else {
          console.error('Producto no encontrado');
          this.error = true;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar producto:', error);
        this.error = true;
        this.cargando = false;
      }
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
          
          // Actualizar precio con cantidad
          this.actualizarPrecioConCantidad();
        },
        error: (error) => {
          console.error('Error al cargar variantes:', error);
          this.variantes = [];
          this.varianteSeleccionada = null;
          this.actualizarPrecioConCantidad();
        }
      });
  }

  /**
   * Selecciona una variante del producto
   */
  seleccionarVariante(variante: Variante) {
    this.varianteSeleccionada = variante;
    this.actualizarPrecioConCantidad();
  }

  /**
   * Cambiar cantidad seleccionada y actualizar precio
   */
  cambiarCantidad(cantidad: number): void {
    this.cantidadSeleccionada = this.precioCantidadService.validarCantidad(cantidad);
    this.actualizarPrecioConCantidad();
  }

  /**
   * Actualiza el precio basado en cantidad y variante
   */
  private actualizarPrecioConCantidad(): void {
    const precioBase = this.precioActual;
    this.precioConCantidad = this.precioCantidadService.calcularPrecioTotal(
      precioBase,
      this.cantidadSeleccionada
    );
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
    
    // Construir mensaje limpio y bien formateado
    let mensaje = `*CONSULTA DE PRODUCTO - PLAXTILINEAS*\n`;
    mensaje += `${'='.repeat(40)}\n\n`;
    
    mensaje += `*PRODUCTO DE INTERÉS:*\n`;
    mensaje += `${nombreCompleto}\n\n`;
    
    mensaje += `*INFORMACIÓN TÉCNICA:*\n`;
    
    if (this.varianteSeleccionada) {
      mensaje += `• Variante: ${this.varianteSeleccionada.nombre}\n`;
    }
    
    mensaje += `• Categoría: ${this.producto.categoria}\n`;
    mensaje += `• Subcategoría: ${this.producto.subcategoria}\n\n`;
    
    mensaje += `*CANTIDAD SOLICITADA:*\n`;
    mensaje += `${this.cantidadSeleccionada} ${this.cantidadSeleccionada === 1 ? 'unidad' : 'unidades'}\n\n`;
    
    mensaje += `*PRECIO:*\n`;
    mensaje += `• Precio unitario: ${this.formatearPrecio(this.precioActual)}\n`;
    mensaje += `• Precio total: ${this.formatearPrecio(this.precioConCantidad)}\n\n`;
    
    if (this.descripcionBase) {
      mensaje += `*DESCRIPCIÓN:*\n`;
      mensaje += `${this.descripcionBase}\n\n`;
    }
    
    mensaje += `*SOLICITO INFORMACIÓN SOBRE:*\n`;
    mensaje += `✓ Disponibilidad actual del producto\n`;
    mensaje += `✓ Características técnicas detalladas\n`;
    mensaje += `✓ Opciones y costo de envío\n`;
    mensaje += `✓ Formas de pago disponibles\n`;
    mensaje += `✓ Tiempo de entrega\n\n`;
    
    mensaje += `Quedo atento a sus comentarios.`;
    
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
    if (this.producto?.subcategoria_id) {
      this.menuStateService.clearLastSelectedSubcategory();
      this.router.navigate(['/productos'], {
        queryParams: { subcategoria_id: this.producto.subcategoria_id }
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

  /**
   * Obtiene el precio actual basado en la variante seleccionada
   */
  get precioActual(): number {
    if (this.varianteSeleccionada) {
      return this.varianteSeleccionada.precio;
    }
    return this.producto?.precio || 0;
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

  abrirModalDescripcion() {
    this.mostrarModalDescripcion = true;
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  }

  cerrarModalDescripcion() {
    this.mostrarModalDescripcion = false;
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
  }

  // Cerrar modales con tecla Esc
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.mostrarModalImagen) {
      this.cerrarModalImagen();
    }
    if (this.mostrarModalDescripcion) {
      this.cerrarModalDescripcion();
    }
  }

  /**
   * Copiar el enlace actual del producto al portapapeles
   */
  copiarEnlace(): void {
    const enlace = window.location.href;
    
    navigator.clipboard.writeText(enlace).then(() => {
      console.log('✓ Enlace copiado al portapapeles');
      this.enlaceCopiado = true;
      
      // Mostrar el mensaje durante 3 segundos
      setTimeout(() => {
        this.enlaceCopiado = false;
      }, 3000);
    }).catch(err => {
      console.error('Error al copiar enlace:', err);
      // Fallback para navegadores antiguos
      this.copiarEnlaceAntiguoBrowser(enlace);
    });
  }

  /**
   * Fallback para copiar enlace en navegadores antiguos
   */
  private copiarEnlaceAntiguoBrowser(enlace: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = enlace;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      console.log('✓ Enlace copiado (método antiguo)');
      this.enlaceCopiado = true;
      
      setTimeout(() => {
        this.enlaceCopiado = false;
      }, 3000);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  
  /**
   * Calcula la posición del zoom basada en la posición del cursor
   */
  onImageMouseMove(event: MouseEvent): void {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    // Calcula la posición relativa del cursor (0 a 1)
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    // Convierte a porcentaje para la traslación (0% a 100%)
    this.zoomX = x * 100;
    this.zoomY = y * 100;
  }

  /**
   * Reinicia la posición del zoom cuando el cursor sale
   */
  onImageMouseLeave(): void {
    this.zoomX = 50;
    this.zoomY = 50;
  }

  /**
   * Convierte un ProductoEditable a ProductoMenu
   */
  private convertirProductoEditableAMenu(productoEditable: any): ProductoMenu {
    return {
      id: productoEditable.id,
      nombre: productoEditable.nombre,
      descripcion: productoEditable.descripcion,
      cantidad: productoEditable.cantidad || 0,
      precio: typeof productoEditable.precio === 'string' ? parseFloat(productoEditable.precio) : productoEditable.precio,
      imagen_url: productoEditable.imagen_url,
      subcategoria_id: productoEditable.subcategoria_id,
      subcategoria: productoEditable.subcategoria,
      categoria: productoEditable.categoria,
      unidad: productoEditable.unidad || 'unidades'
    };
  }
}