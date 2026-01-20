import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoriaMenuService } from '../../../services/categoria-menu.service';
import { MenuStateService } from '../../../services/menu-state.service';
import { Subject, takeUntil } from 'rxjs';

interface Subcategoria {
  id: number;
  nombre: string;
  categoria_id: number;
}

interface Categoria {
  id: number;
  nombre: string;
  imagen_url?: string;
  subcategorias?: Subcategoria[];
}

@Component({
  selector: 'app-menu-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-dropdown.html',
  styleUrl: './menu-dropdown.css',
})
export class MenuDropdown implements OnInit, OnDestroy {
  categorias: Categoria[] = [];
  menuVisible = false;
  hoveredCategoriaId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private categoriaMenuService: CategoriaMenuService,
    private menuStateService: MenuStateService
  ) {
    this.cargarCategorias();
  }

  ngOnInit(): void {
    // Cargar categorías al inicializar
    if (this.categorias.length === 0) {
      this.cargarCategorias();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCategorias(): void {
    this.categoriaMenuService.obtenerCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          console.log('Categorías cargadas:', data);
          this.categorias = data.map(cat => ({
            id: cat.id,
            nombre: cat.nombre,
            imagen_url: cat.imagen_url,
            subcategorias: cat.subcategorias && Array.isArray(cat.subcategorias)
              ? cat.subcategorias.map((sub: any) => ({
                  id: sub.id,
                  nombre: sub.nombre,
                  categoria_id: sub.categoria_id || cat.id
                }))
              : []
          }));
          console.log('Categorías procesadas:', this.categorias);
        },
        error: (err) => {
          console.error('Error cargando categorías:', err);
        }
      });
  }

  onMouseEnter(): void {
    this.menuVisible = true;
  }

  onMouseLeave(): void {
    this.menuVisible = false;
    this.hoveredCategoriaId = null;
  }

  onCategoriaHover(categoriaId: number): void {
    this.hoveredCategoriaId = categoriaId;
  }

  onCategoriaLeave(): void {
    this.hoveredCategoriaId = null;
  }

  onSubcategoriaSelect(subcategoriaId: number): void {
    this.menuStateService.saveLastSelectedSubcategory(subcategoriaId);
    console.log(`📌 Subcategoría ${subcategoriaId} seleccionada desde dropdown`);
  }

  closeMenu(): void {
    this.menuVisible = false;
    this.hoveredCategoriaId = null;
  }

  @HostListener('window:resize', [])
  onWindowResize(): void {
    if (window.innerWidth <= 768) {
      this.closeMenu();
    }
  }
}


