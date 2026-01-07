// src/app/components/menu-categorias/menu-categorias.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoriaMenuService } from '../../services/categoria-menu.service';
import { MenuStateService } from '../../services/menu-state.service';
import { CategoriaConSubcategorias } from '../../models/categoriaMenu.model';

// Interface para extender la categoría con propiedades adicionales
interface CategoriaExtendida extends CategoriaConSubcategorias {
  expanded?: boolean;
  cantidad?: number;
}

@Component({
  selector: 'app-menu-categorias-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-categorias.component.html',
  styleUrls: ['./menu-categorias.component.css']
})
export class MenuCategoriasComponent implements OnInit {
  categorias: CategoriaExtendida[] = [];
  mostrarTodosProductos: boolean = false; // Nueva variable de estado

  constructor(
    private categoriaService: CategoriaMenuService,
    private menuStateService: MenuStateService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadCategories();
    
    // Verificar si estamos mostrando todos los productos
    this.checkIfShowingAllProducts();
  }

  /**
   * Verificar si la URL actual indica que estamos mostrando todos los productos
   */
  private checkIfShowingAllProducts(): void {
    this.route.queryParams.subscribe(params => {
      const tieneSubcat = !!params['subcategoria_id'];
      const tieneCat = !!params['categoria_id'];
      
      // Si no hay filtros, estamos mostrando todos los productos
      this.mostrarTodosProductos = !tieneSubcat && !tieneCat;
    });
  }

  private loadCategories(): void {
    let categoriaIdDesdeURL: number | null = null;
    
    this.route.queryParams.subscribe(params => {
      const catId = parseInt(params['categoria_id']);
      if (!isNaN(catId)) {
        categoriaIdDesdeURL = catId;
      }
    });

    this.categoriaService.obtenerCategorias().subscribe(data => {
      const expandedIds = this.menuStateService.getExpandedCategories();
      
      this.categorias = data.map(c => ({ 
        ...c, 
        expanded: expandedIds.includes(c.id),
        cantidad: this.calcularCantidadTotal(c)
      }));

      // Si hay un ID desde URL, lo expandimos
      if (categoriaIdDesdeURL) {
        const encontrada = this.categorias.find(c => c.id === categoriaIdDesdeURL);
        if (encontrada && !encontrada.expanded) {
          encontrada.expanded = true;
          this.menuStateService.expandCategory(encontrada.id);
        }
      }
      
      this.checkForSavedSubcategory();
    });
  }

  private calcularCantidadTotal(categoria: CategoriaConSubcategorias): number {
    if (!categoria.subcategorias || categoria.subcategorias.length === 0) {
      return 0;
    }
    
    return categoria.subcategorias.reduce((total, subcat) => {
      return total + (subcat.cantidad || 0);
    }, 0);
  }

  private checkForSavedSubcategory(): void {
    const savedSubcategoryId = this.menuStateService.getLastSelectedSubcategory();
    
    if (savedSubcategoryId) {
      console.log(`📌 Subcategoría guardada encontrada: ${savedSubcategoryId}`);
      
      let categoriaPadreId: number | null = null;
      
      for (const categoria of this.categorias) {
        const tieneSubcategoria = categoria.subcategorias?.some(
          sub => sub.id === savedSubcategoryId
        );
        
        if (tieneSubcategoria) {
          categoriaPadreId = categoria.id;
          break;
        }
      }
      
      if (categoriaPadreId) {
        const categoria = this.categorias.find(c => c.id === categoriaPadreId);
        if (categoria && !categoria.expanded) {
          categoria.expanded = true;
          this.menuStateService.expandCategory(categoria.id);
        }
        
        setTimeout(() => {
          this.cargarProductosDeSubcategoria(savedSubcategoryId);
        }, 500);
      }
    }
  }

  private cargarProductosDeSubcategoria(subcatId: number): void {
    console.log(`🔄 Cargando productos de subcategoría guardada: ${subcatId}`);
    
    this.router.navigate(['/productos'], {
      queryParams: { subcategoria_id: subcatId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  toggle(cat: CategoriaExtendida) {
    const newExpandedState = !cat.expanded;
    cat.expanded = newExpandedState;
    this.menuStateService.toggleCategory(cat.id, newExpandedState);
  }

  seleccionarSubcategoria(subcatId: number) {
    console.log(`🎯 Subcategoría seleccionada: ${subcatId}`);
    
    // Actualizar estado
    this.mostrarTodosProductos = false;
    
    // Guardar la subcategoría seleccionada
    this.menuStateService.saveLastSelectedSubcategory(subcatId);
    
    // Guardar scroll position
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    this.menuStateService.saveScrollPosition(scrollPosition);
    
    // Navegar
    this.router.navigate(['/productos'], {
      queryParams: { subcategoria_id: subcatId },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * ⭐ ACTUALIZADO: Ver todos los productos (sin filtros)
   */
  verTodosProductos() {
    console.log('🔍 Ver todos los productos');
    this.menuStateService.clearLastSelectedSubcategory();
    this.router.navigate(['/productos']);
  }

  /**
   * Seleccionar categoría completa (todos los productos de una categoría)
   */
  seleccionarCategoria(categoriaId: number) {
    console.log(`🏷️ Categoría seleccionada: ${categoriaId}`);
    
    // Actualizar estado
    this.mostrarTodosProductos = false;
    
    // Limpiar subcategoría guardada
    this.menuStateService.clearLastSelectedSubcategory();
    
    // Navegar con parámetro de categoría
    this.router.navigate(['/productos'], {
      queryParams: { categoria_id: categoriaId },
      queryParamsHandling: 'merge'
    });
  }
}