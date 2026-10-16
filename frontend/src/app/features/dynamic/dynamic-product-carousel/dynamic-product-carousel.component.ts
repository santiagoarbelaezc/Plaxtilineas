import { Component, Input, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductosService } from '../../../services/productos.service';
import { CategoriasService } from '../../../services/categorias.service';
import { MenuStateService } from '../../../services/menu-state.service';
import { ProductoEditable } from '../../../models/producto.model';
import { optimizeForThumbnail } from '../../../utils/cloudinary-optimizer';

interface ProductCarouselContenido {
  categoriaId: number;
  titulo?: string;
  subtitulo?: string;
}

@Component({
  selector: 'app-dynamic-product-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dynamic-product-carousel.component.html',
  styleUrls: ['./dynamic-product-carousel.component.css']
})
export class DynamicProductCarouselComponent implements OnInit {
  @Input() contenido!: ProductCarouselContenido;
  @ViewChild('productosGrid') productosGrid!: ElementRef;

  productos: ProductoEditable[] = [];
  categoriaNombre = '';
  loading = true;
  error: string | null = null;

  currentPage = 0;
  itemsPerPage = 5;
  pagesArray: number[] = [];
  isMobile = false;

  constructor(
    private productosService: ProductosService,
    private categoriasService: CategoriasService,
    private router: Router,
    private menuStateService: MenuStateService
  ) {}

  ngOnInit(): void {
    this.checkIfMobile();
    this.cargarDatos();
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
    if (width < 640) {
      this.itemsPerPage = 1;
    } else if (width < 768) {
      this.itemsPerPage = 2;
    } else if (width < 1024) {
      this.itemsPerPage = 3;
    } else if (width < 1400) {
      this.itemsPerPage = 4;
    } else {
      this.itemsPerPage = 5;
    }
    this.updatePagesArray();
  }

  private updatePagesArray(): void {
    const totalPages = Math.ceil(this.productos.length / this.itemsPerPage);
    this.pagesArray = Array.from({ length: totalPages }, (_, i) => i);
    this.currentPage = 0; 
  }

  cargarDatos(): void {
    if (!this.contenido || !this.contenido.categoriaId) {
      this.loading = false;
      this.error = 'No se ha configurado una categoría válida.';
      return;
    }

    const catId = Number(this.contenido.categoriaId);
    this.loading = true;
    this.error = null;

    // Obtener nombre de la categoría
    this.categoriasService.getCategorias().subscribe({
      next: (cats) => {
        const cat = cats.find(c => Number(c.id) === catId);
        if (cat) {
          this.categoriaNombre = cat.nombre;
        }
      }
    });

    // Obtener productos
    this.productosService.obtenerProductosPorCategoriaId(catId).subscribe({
      next: (productos) => {
        this.productos = productos.map(p => ({
          ...p,
          editando: false
        }));
        this.loading = false;
        this.updateItemsPerPage();
      },
      error: (err) => {
        console.error('Error al cargar productos para carrusel dinámico:', err);
        this.error = 'No se pudieron cargar los productos.';
        this.loading = false;
      }
    });
  }

  scrollCarrusel(direction: 'prev' | 'next'): void {
    if (!this.productosGrid) return;
    const grid = this.productosGrid.nativeElement;
    const itemWidth = grid.scrollWidth / this.productos.length;
    const scrollAmount = itemWidth * this.itemsPerPage;

    if (direction === 'prev') {
      grid.scrollLeft -= scrollAmount;
      this.currentPage = Math.max(0, this.currentPage - 1);
    } else {
      grid.scrollLeft += scrollAmount;
      this.currentPage = Math.min(this.pagesArray.length - 1, this.currentPage + 1);
    }
  }

  goToPage(page: number): void {
    if (!this.productosGrid) return;
    const grid = this.productosGrid.nativeElement;
    const itemWidth = grid.scrollWidth / this.productos.length;
    const scrollAmount = itemWidth * this.itemsPerPage * page;

    grid.scrollTo({
      left: scrollAmount,
      behavior: 'smooth'
    });

    this.currentPage = page;
  }

  verDetalles(productoId: number, nombre?: string): void {
    this.menuStateService.clearLastSelectedSubcategory();
    const slug = nombre ? nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : '';
    const urlParam = slug ? `${productoId}-${slug}` : productoId;
    this.router.navigate(['/producto', urlParam]);
  }

  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${precioFormateado}`;
  }

  optimizarImagen(url: string): string {
    return optimizeForThumbnail(url, 300);
  }
}
