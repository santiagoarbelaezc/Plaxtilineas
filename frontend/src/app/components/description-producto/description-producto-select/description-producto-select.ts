import { Component, OnInit, OnDestroy } from '@angular/core';
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
            // Convertir los datos al tipo ProductoMenu, manteniendo campos extra como any
            this.producto = producto as any;
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
      this.cargando = false;
      console.log('Producto obtenido del estado de navegación:', this.producto);
      return;
    }
    
    // 2. Usar fetch directamente para obtener el producto
    console.log('Buscando producto por ID:', id);
    
    fetch(`/api/productos/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Producto no encontrado');
        }
        return response.json();
      })
      .then(data => {
        console.log('Producto obtenido de API:', data);
        
        // Convertir datos del backend al tipo ProductoMenu, manteniendo campos extra
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

  // Método para generar el enlace de WhatsApp
  generarWhatsAppLink(): string {
    if (!this.producto) return '';
    
    const numeroWhatsApp = '+573006680125';
    const mensaje = `Hola, estoy interesado en el siguiente producto de Plaxtilineas:\n\n` +
                   `*${this.producto.nombre}*\n` +
                   `Código: ${this.producto.id}\n` +
                   `Descripción: ${this.producto.descripcion}\n` +
                   `Categoría: ${this.producto.categoria}\n` +
                   `Subcategoría: ${this.producto.subcategoria}\n` +
                   `Precio: $${this.formatearPrecio(this.producto.precio)}\n\n` +
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