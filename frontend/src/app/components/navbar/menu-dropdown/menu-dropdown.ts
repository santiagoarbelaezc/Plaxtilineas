import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
  private closeTimeout: any;

  constructor(
    private categoriaMenuService: CategoriaMenuService,
    private menuStateService: MenuStateService,
    private router: Router
  ) {
    this.cargarCategorias();
  }

  ngOnInit(): void {
    // Cargar categorías al inicializar
    if (this.categorias.length === 0) {
      this.cargarCategorias();
    }

    // Suscribirse a eventos de cierre del dropdown desde el navbar
    this.menuStateService.closeDropdown$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.closeMenu();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
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

  onMouseLeave(): void {
    // Agregar un pequeño delay para evitar flickering
    this.closeTimeout = setTimeout(() => {
      this.menuVisible = false;
      this.hoveredCategoriaId = null;
    }, 150);
  }

  onMouseEnter(): void {
    // Cancelar el timeout si volvemos a entrar
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.menuVisible = true;
  }

  onTriggerClick(event: Event): void {
    event.preventDefault();
    
    if (this.menuVisible) {
      // Si el dropdown está abierto, cerrarlo
      this.closeMenu();
    } else {
      // Si está cerrado, navegamos a productos después de un pequeño delay
      this.menuStateService.clearLastSelectedSubcategory();
      console.log('🔍 Navegando a productos, última subcategoría limpiada');
      
      // Navegar a productos después de cerrar el menú
      setTimeout(() => {
        this.router.navigate(['/productos']);
        this.closeMenu();
      }, 100);
    }
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


