// src/app/components/menu-categorias/menu-categorias.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoriaMenuService } from '../../services/categoria-menu.service';
import { MenuStateService } from '../../services/menu-state.service';
import { CategoriaConSubcategorias } from '../../models/categoriaMenu.model';

@Component({
  selector: 'app-menu-categorias-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-categorias.component.html',
  styleUrls: ['./menu-categorias.component.css']
})
export class MenuCategoriasComponent implements OnInit {
  categorias: (CategoriaConSubcategorias & { expanded?: boolean })[] = [];

  constructor(
    private categoriaService: CategoriaMenuService,
    private menuStateService: MenuStateService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  private loadCategories(): void {
    // 1. Primero capturamos el queryParam
    let categoriaIdDesdeURL: number | null = null;
    
    this.route.queryParams.subscribe(params => {
      const catId = parseInt(params['categoria_id']);
      if (!isNaN(catId)) {
        categoriaIdDesdeURL = catId;
      }
    });

    // 2. Luego cargamos las categorías
    this.categoriaService.obtenerCategorias().subscribe(data => {
      // Cargar estado guardado
      const expandedIds = this.menuStateService.getExpandedCategories();
      
      this.categorias = data.map(c => ({ 
        ...c, 
        expanded: expandedIds.includes(c.id) 
      }));

      // 3. Si hay un ID desde URL, lo expandimos
      if (categoriaIdDesdeURL) {
        const encontrada = this.categorias.find(c => c.id === categoriaIdDesdeURL);
        if (encontrada && !encontrada.expanded) {
          encontrada.expanded = true;
          this.menuStateService.expandCategory(encontrada.id);
        }
      }
      
      // ⭐ NUEVO: Verificar si hay subcategoría guardada para cargar automáticamente
      this.checkForSavedSubcategory();
    });
  }

  /**
   * ⭐ NUEVO: Verificar si hay subcategoría guardada y cargarla
   */
  private checkForSavedSubcategory(): void {
    const savedSubcategoryId = this.menuStateService.getLastSelectedSubcategory();
    
    if (savedSubcategoryId) {
      console.log(`📌 Subcategoría guardada encontrada: ${savedSubcategoryId}`);
      
      // Buscar en qué categoría está esta subcategoría
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
      
      // Si encontramos la categoría padre, expandirla
      if (categoriaPadreId) {
        const categoria = this.categorias.find(c => c.id === categoriaPadreId);
        if (categoria && !categoria.expanded) {
          categoria.expanded = true;
          this.menuStateService.expandCategory(categoria.id);
          console.log(`📂 Categoría padre ${categoria.nombre} expandida automáticamente`);
        }
        
        // Esperar un momento y luego cargar los productos
        setTimeout(() => {
          this.cargarProductosDeSubcategoria(savedSubcategoryId);
        }, 500);
      }
    }
  }

  /**
   * ⭐ NUEVO: Cargar productos de una subcategoría específica
   */
  private cargarProductosDeSubcategoria(subcatId: number): void {
    console.log(`🔄 Cargando productos de subcategoría guardada: ${subcatId}`);
    
    // Navegar para cargar los productos
    this.router.navigate(['/productos'], {
      queryParams: { subcategoria_id: subcatId },
      queryParamsHandling: 'merge',
      replaceUrl: true // Para no agregar al historial
    });
  }

  toggle(cat: CategoriaConSubcategorias & { expanded?: boolean }) {
    const newExpandedState = !cat.expanded;
    cat.expanded = newExpandedState;
    this.menuStateService.toggleCategory(cat.id, newExpandedState);
  }

  seleccionarSubcategoria(subcatId: number) {
    console.log(`🎯 Subcategoría seleccionada: ${subcatId}`);
    
    // ⭐ GUARDAR la subcategoría seleccionada
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
}