// src/app/components/product-list/product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations'; 
import { ProductoMenu } from '../../models/productoMenu.model';
import { ProductoMenuService } from '../../services/producto-menu.service';
import { ProductSelectService } from '../../services/product-select.service';
import { MenuStateService } from '../../services/menu-state.service'; // ⭐ Importar nuevo

@Component({
  selector: 'app-product-list-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProductListComponent implements OnInit {
  productos: ProductoMenu[] = [];
  cargando = false;
  private isInitialLoad = true;

  constructor(
    private route: ActivatedRoute,
    private productoService: ProductoMenuService,
    private productSelectService: ProductSelectService,
    private menuStateService: MenuStateService // ⭐ Inyectar nuevo servicio
  ) {}

  ngOnInit() {
    // Suscribirse a cambios en los query params
    this.route.queryParams.subscribe(params => {
      this.handleQueryParams(params);
    });
  }

  private handleQueryParams(params: any): void {
    const subcatId = parseInt(params['subcategoria_id']);
    
    if (!isNaN(subcatId)) {
      console.log(`🎯 Subcategoría desde URL: ${subcatId}`);
      this.cargarProductos(subcatId);
    } else if (this.isInitialLoad) {
      // ⭐ NUEVO: Si es la carga inicial y no hay subcategoría en URL,
      // intentar cargar la última subcategoría guardada
      this.loadLastSavedSubcategory();
    }
    
    this.isInitialLoad = false;
  }

  /**
   * ⭐ NUEVO: Cargar la última subcategoría guardada
   */
  private loadLastSavedSubcategory(): void {
    const savedSubcategoryId = this.menuStateService.getLastSelectedSubcategory();
    
    if (savedSubcategoryId) {
      console.log(`📌 Cargando subcategoría guardada: ${savedSubcategoryId}`);
      
      // Usar setTimeout para evitar problemas de timing
      setTimeout(() => {
        this.cargarProductos(savedSubcategoryId);
        
        // Actualizar la URL sin recargar la página
        const url = new URL(window.location.href);
        url.searchParams.set('subcategoria_id', savedSubcategoryId.toString());
        window.history.replaceState({}, '', url.toString());
      }, 300);
    } else {
      console.log('ℹ️ No hay subcategoría guardada para cargar');
      this.productos = [];
    }
  }

  cargarProductos(subcatId: number) {
    console.log(`🔄 Cargando productos para subcategoría: ${subcatId}`);
    
    this.cargando = true;
    this.productoService.obtenerPorSubcategoria(subcatId).subscribe({
      next: (data: ProductoMenu[]) => {
        setTimeout(() => {
          this.productos = data;
          this.cargando = false;
          
          console.log(`✅ ${data.length} productos cargados`);
          
          // Scroll suave a la sección
          setTimeout(() => {
            const seccion = document.getElementById('productos-seccion');
            if (seccion) {
              const offset = 100;
              const seccionTop = seccion.getBoundingClientRect().top + window.pageYOffset;
              window.scrollTo({
                top: seccionTop - offset,
                behavior: 'smooth'
              });
            }
          }, 300);
        }, 300);
      },
      error: (error) => {
        console.error('❌ Error al cargar productos:', error);
        setTimeout(() => {
          this.productos = [];
          this.cargando = false;
        }, 300);
      }
    });
  }

  verDetalles(producto: ProductoMenu) {
    this.productSelectService.verDetallesProducto(producto);
  }
}