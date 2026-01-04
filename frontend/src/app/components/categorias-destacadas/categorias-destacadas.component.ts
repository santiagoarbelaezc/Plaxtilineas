import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoriaIndex } from '../../models/categoriaIndex.model';
import { CategoriasService } from '../../services/categorias.service';
import { CategoriaMenuService } from '../../services/categoria-menu.service';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-categorias-destacadas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categorias-destacadas.component.html',
  styleUrls: ['./categorias-destacadas.component.css']
})
export class CategoriasDestacadasComponent implements OnInit {
  @ViewChild('categoriasGrid') categoriasGrid!: ElementRef;
  
  categorias: CategoriaIndex[] = [];
  categoriasConSubcategorias: any[] = [];
  currentPage = 0;
  itemsPerPage = 11;
  pagesArray: number[] = [];
  isMobile = false;

  // 🔹 Categorías con imágenes fijas
  categoriasFijas = [
    { nombre: 'pisos', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218660/cate4_vqgwa9.png' },
    { nombre: 'espumas', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218659/cate2_zsdzyl.png' },
    { nombre: 'vinipel', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218670/cate7_etqoez.png' },
    { nombre: 'mimbres', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218659/cate1_ub8akd.png' },
    { nombre: 'sogas', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766975481/feature1-plaxti_j04h8a.png' },
    { nombre: 'pegantes', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218659/cate5_vr4sct.png' },
    { nombre: 'mallas', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218660/cate6_suvlyh.png' }
  ];

  constructor(
    private categoriasService: CategoriasService,
    private categoriaMenuService: CategoriaMenuService,
    private menuStateService: MenuStateService
  ) {}

  ngOnInit(): void {
    this.checkIfMobile();
    this.loadCategorias();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkIfMobile();
    this.updateItemsPerPage();
  }

  private checkIfMobile(): void {
    this.isMobile = window.innerWidth < 1024;
  }

  private updateItemsPerPage(): void {
    const width = window.innerWidth;
    
    if (width < 360) {
      this.itemsPerPage = 2;
    } else if (width < 480) {
      this.itemsPerPage = 3;
    } else if (width < 640) {
      this.itemsPerPage = 4;
    } else if (width < 768) {
      this.itemsPerPage = 5;
    } else if (width < 1024) {
      this.itemsPerPage = 6;
    } else if (width < 1200) {
      this.itemsPerPage = 8;
    } else {
      this.itemsPerPage = 11;
    }
    
    this.updatePagesArray();
  }

  private updatePagesArray(): void {
    const totalPages = Math.ceil(this.categorias.length / this.itemsPerPage);
    this.pagesArray = Array.from({ length: totalPages }, (_, i) => i);
  }

  /**
   * Cargar categorías
   */
  private loadCategorias(): void {
    this.categoriasService.getCategorias().subscribe({
      next: data => {
        this.categorias = this.combineCategoriasWithFixedImages(data);
        this.updateItemsPerPage();
        this.cargarCategoriasConSubcategorias();
      },
      error: err => {
        console.error('❌ Error al cargar categorías:', err);
        this.cargarCategoriasFijas();
      }
    });
  }

  private combineCategoriasWithFixedImages(data: CategoriaIndex[]): CategoriaIndex[] {
    return data.map(cat => {
      const categoriaFija = this.categoriasFijas.find(f => 
        f.nombre.toLowerCase() === cat.nombre.toLowerCase()
      );
      
      return {
        ...cat,
        icono_url: categoriaFija?.icono_url || cat.icono_url
      };
    });
  }

  /**
   * Navegar en el carrusel
   */
  scrollCarrusel(direction: 'prev' | 'next'): void {
    const grid = this.categoriasGrid.nativeElement;
    const itemWidth = grid.scrollWidth / this.categorias.length;
    const scrollAmount = itemWidth * this.itemsPerPage;
    
    if (direction === 'prev') {
      grid.scrollLeft -= scrollAmount;
      this.currentPage = Math.max(0, this.currentPage - 1);
    } else {
      grid.scrollLeft += scrollAmount;
      this.currentPage = Math.min(this.pagesArray.length - 1, this.currentPage + 1);
    }
  }

  /**
   * Ir a una página específica
   */
  goToPage(page: number): void {
    const grid = this.categoriasGrid.nativeElement;
    const itemWidth = grid.scrollWidth / this.categorias.length;
    const scrollAmount = itemWidth * this.itemsPerPage * page;
    
    grid.scrollTo({
      left: scrollAmount,
      behavior: 'smooth'
    });
    
    this.currentPage = page;
  }

  /**
   * El resto de los métodos se mantienen igual...
   */
  private cargarCategoriasConSubcategorias(): void {
    this.categoriaMenuService.obtenerCategorias().subscribe({
      next: (categoriasCompletas) => {
        this.categoriasConSubcategorias = categoriasCompletas;
      },
      error: (err) => {
        console.error('❌ Error al cargar categorías con subcategorías:', err);
        this.categoriasConSubcategorias = [];
      }
    });
  }

  private cargarCategoriasFijas(): void {
    this.categorias = this.categoriasFijas.map((cat, index) => ({
      id: index + 1,
      nombre: cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1),
      icono_url: cat.icono_url,
      descripcion: `Productos de ${cat.nombre}`,
      destacado: true,
      orden: index + 1
    }));
    
    this.updateItemsPerPage();
  }

  obtenerPrimeraSubcategoria(categoriaId: number): number | null {
    if (this.categoriasConSubcategorias.length === 0) {
      return null;
    }

    const categoriaCompleta = this.categoriasConSubcategorias.find(
      cat => cat.id === categoriaId
    );

    if (!categoriaCompleta || !categoriaCompleta.subcategorias || categoriaCompleta.subcategorias.length === 0) {
      return null;
    }

    return categoriaCompleta.subcategorias[0].id;
  }

  onCategoriaClick(categoria: CategoriaIndex): void {
    const subcategoriaId = this.obtenerPrimeraSubcategoria(categoria.id);
    
    if (subcategoriaId) {
      this.menuStateService.saveLastSelectedSubcategory(subcategoriaId);
    }
  }

  handleImageError(event: Event, categoria: CategoriaIndex): void {
    const imgElement = event.target as HTMLImageElement;
    const categoriaFija = this.categoriasFijas.find(
      f => f.nombre.toLowerCase() === categoria.nombre.toLowerCase()
    );
    
    if (categoriaFija) {
      imgElement.src = categoriaFija.icono_url;
    } else {
      imgElement.src = 'assets/images/default-category.png';
    }
  }
}