import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductoMenu } from '../../../models/productoMenu.model';
import { ProductSelectService } from '../../../services/product-select.service';
import { ProductosService } from '../../../services/productos.service';

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
  
  // Variables para manejo de opciones
  opcionesProducto: string[] = [];
  opcionSeleccionada: string = '';
  descripcionBase: string = '';
  productoBaseNombre: string = '';
  precioPorOpcion: { [key: string]: number } = {};
  
  private subscriptions: Subscription[] = [];

  constructor(
    public productSelectService: ProductSelectService,
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService
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
            this.procesarDescripcion();
            this.cargando = false;
            this.error = false;
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
      this.procesarDescripcion();
      this.cargando = false;
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
        this.procesarDescripcion();
        
        if (this.producto) {
          this.productSelectService.seleccionarProducto(this.producto);
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
   * Procesa la descripción para extraer opciones basadas en guiones
   */
  private procesarDescripcion() {
    if (!this.producto) return;
    
    const descripcion = this.producto.descripcion || '';
    const nombre = this.producto.nombre || '';
    
    // Procesar nombre para extraer opciones
    const nombrePartes = nombre.split(' -');
    if (nombrePartes.length > 1) {
      this.productoBaseNombre = nombrePartes[0].trim();
      this.opcionesProducto = nombrePartes.slice(1).map(opcion => `-${opcion.trim()}`);
      
      // Seleccionar la primera opción por defecto
      if (this.opcionesProducto.length > 0) {
        this.opcionSeleccionada = this.opcionesProducto[0];
      }
    } else {
      this.productoBaseNombre = nombre;
      this.opcionesProducto = [];
      this.opcionSeleccionada = '';
    }
    
    // Procesar descripción para extraer opciones y precios
    this.extraerOpcionesYpreciosDesdeDescripcion(descripcion);
    
    // Establecer descripción base (sin las opciones específicas)
    this.descripcionBase = this.obtenerDescripcionBase(descripcion);
  }

  /**
   * Extrae opciones y precios desde la descripción
   */
  private extraerOpcionesYpreciosDesdeDescripcion(descripcion: string) {
    const lineas = descripcion.split('\n');
    let encontroOpciones = false;
    
    for (const linea of lineas) {
      const lineaTrim = linea.trim();
      
      // Buscar patrones como "-1mm: $1000" o "-2mm - $1500"
      const match = lineaTrim.match(/^(-[\w\d\s\/]+)[:\-]\s*\$\s*([\d.,]+)/i);
      if (match) {
        const opcion = match[1].trim();
        const precioTexto = match[2].replace(',', '.');
        const precio = parseFloat(precioTexto);
        
        if (!isNaN(precio)) {
          this.precioPorOpcion[opcion] = precio;
          
          // Si esta opción no está en la lista, añadirla
          if (!this.opcionesProducto.includes(opcion)) {
            this.opcionesProducto.push(opcion);
          }
          
          encontroOpciones = true;
        }
      } else if (lineaTrim.startsWith('-') && !encontroOpciones) {
        // Si no tiene precio explícito, usar el precio base
        const opcion = lineaTrim;
        if (!this.opcionesProducto.includes(opcion)) {
          this.opcionesProducto.push(opcion);
          this.precioPorOpcion[opcion] = this.producto?.precio || 0;
        }
      }
    }
  }

  /**
   * Obtiene la descripción base sin las líneas de opciones
   */
  private obtenerDescripcionBase(descripcion: string): string {
    const lineas = descripcion.split('\n');
    const lineasBase = lineas.filter(linea => {
      const lineaTrim = linea.trim();
      // Excluir líneas que comienzan con guion (opciones)
      return !lineaTrim.startsWith('-') || 
             !this.opcionesProducto.some(opcion => lineaTrim.includes(opcion));
    });
    
    return lineasBase.join('\n').trim();
  }

  /**
   * Selecciona una opción del producto
   */
  seleccionarOpcion(opcion: string) {
    this.opcionSeleccionada = opcion;
  }

  /**
   * Obtiene el precio actual basado en la opción seleccionada
   */
  get precioActual(): number {
    if (this.opcionSeleccionada && this.precioPorOpcion[this.opcionSeleccionada]) {
      return this.precioPorOpcion[this.opcionSeleccionada];
    }
    return this.producto?.precio || 0;
  }

  // Método para generar el enlace de WhatsApp con la opción seleccionada
  generarWhatsAppLink(): string {
    if (!this.producto) return '';
    
    const numeroWhatsApp = '+573006680125';
    const nombreCompleto = this.opcionSeleccionada 
      ? `${this.productoBaseNombre} ${this.opcionSeleccionada}`
      : this.producto.nombre;
    
    let mensaje = `Hola, estoy interesado en el siguiente producto de Plaxtilineas:\n\n` +
                 `*${nombreCompleto}*\n` +
                 `Código: ${this.producto.id}\n`;
    
    // Añadir información de la opción seleccionada
    if (this.opcionSeleccionada) {
      mensaje += `Tipo seleccionado: ${this.opcionSeleccionada}\n`;
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
    if (!precio && precio !== 0) return '0.00';
    
    return precio.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getHistorialProductos(): ProductoMenu[] {
    return this.productSelectService.getHistorial();
  }

  tieneProductosRelacionadosEnHistorial(): boolean {
    const historial = this.getHistorialProductos();
    return historial.filter(p => p.id !== this.producto?.id).length > 0;
  }
  
  // Método para el template
  verDetallesProducto(producto: ProductoMenu) {
    this.productSelectService.verDetallesProducto(producto);
  }
}