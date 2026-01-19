import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import {
  faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft,
  faBoxes, faTag, faDollarSign, faFolder, faRuler, faAlignLeft,
  faFilter, faList, faSearch, faInbox, faChevronLeft, faChevronRight,
  faListAlt, faSyncAlt, faCaretDown, faCaretUp, faCheck, faXmark,
  faImage, faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

import { ProductosService } from '../../../services/productos.service';
import { SubcategoriasService } from '../../../services/subcategorias.service';
import { VariantesService } from '../../../services/variantes.service';
import { Subcategoria } from '../../../models/subcategoria.model';

interface ProductoInventario {
  id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  subcategoria: string;
  subcategoria_id: number;
  unidad?: string;
  imagen_url: string;
  stock?: number;
  editando?: boolean;
  stockOriginal?: number;
}

interface Variante {
  id: number;
  nombre: string;
  precio: number;
  producto_id: number;
  creado_en?: string;
  editando?: boolean;
  precioOriginal?: number;
}

@Component({
  selector: 'app-inventario-component',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule, CurrencyPipe],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class InventarioComponent implements OnInit {
  // Iconos
  faEdit = faEdit;
  faTrashAlt = faTrashAlt;
  faSave = faSave;
  faTimes = faTimes;
  faPlus = faPlus;
  faArrowLeft = faArrowLeft;
  faBoxes = faBoxes;
  faTag = faTag;
  faDollarSign = faDollarSign;
  faFolder = faFolder;
  faRuler = faRuler;
  faAlignLeft = faAlignLeft;
  faFilter = faFilter;
  faList = faList;
  faSearch = faSearch;
  faInbox = faInbox;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faListAlt = faListAlt;
  faSyncAlt = faSyncAlt;
  faCaretDown = faCaretDown;
  faCaretUp = faCaretUp;
  faCheck = faCheck;
  faXmark = faXmark;
  faImage = faImage;
  faLayerGroup = faLayerGroup;

  // Propiedades del componente
  token: string | null = null;
  
  productos: ProductoInventario[] = [];
  productosFiltrados: ProductoInventario[] = [];
  productosPaginadas: ProductoInventario[] = [];
  subcategorias: Subcategoria[] = [];
  
  filtroSubcategoriaId: string = '';
  searchTerm: string = '';

  // Variantes
  variantesProductos: { [productoId: number]: Variante[] } = {};
  productoMostrandoVariantes: number | null = null;

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;

  constructor(
    private router: Router,
    private productosService: ProductosService,
    private subcategoriasService: SubcategoriasService,
    private variantesService: VariantesService,
    library: FaIconLibrary
  ) {
    library.addIcons(
      faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft,
      faBoxes, faTag, faDollarSign, faFolder, faRuler, faAlignLeft,
      faFilter, faList, faSearch, faInbox, faChevronLeft, faChevronRight,
      faListAlt, faSyncAlt, faCaretDown, faCaretUp, faCheck, faXmark, faImage, faLayerGroup
    );
  }

  ngOnInit(): void {
    this.token = localStorage.getItem('token');
    if (!this.token) {
      Swal.fire('Error', 'No autorizado. Por favor inicia sesión.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    this.cargarSubcategorias();
    this.cargarProductos();
  }

  cargarSubcategorias(): void {
    this.subcategoriasService.getSubcategorias().subscribe({
      next: subs => {
        this.subcategorias = subs;
      },
      error: err => {
        console.error('Error cargando subcategorías:', err);
      }
    });
  }

  cargarProductos(): void {
    const id = this.filtroSubcategoriaId ? parseInt(this.filtroSubcategoriaId) : undefined;
    this.productosService.obtenerProductos(id).subscribe({
      next: data => {
        this.productos = data.map(p => ({
          ...p,
          editando: false,
          stock: 0
        }));
        this.filtrarProductos();
      },
      error: err => {
        console.error('Error cargando productos:', err);
        Swal.fire('Error', 'No se pudieron cargar los productos', 'error');
      }
    });
  }

  filtrarProductos(): void {
    if (this.searchTerm.trim() === '') {
      this.productosFiltrados = [...this.productos];
    } else {
      const termino = this.searchTerm.toLowerCase();
      this.productosFiltrados = this.productos.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        p.descripcion.toLowerCase().includes(termino)
      );
    }
    
    this.paginaActual = 1;
    this.calcularPaginacion();
    this.actualizarDatosPaginados();
  }

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.productosFiltrados.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = this.totalPaginas;
    }
  }

  actualizarDatosPaginados(): void {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.productosPaginadas = this.productosFiltrados.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarDatosPaginados();
    }
  }

  cambiarItemsPorPagina(): void {
    this.itemsPorPagina = Number(this.itemsPorPagina);
    this.paginaActual = 1;
    this.calcularPaginacion();
    this.actualizarDatosPaginados();
  }

  getRangoPaginas(): number[] {
    const paginas: number[] = [];
    const maxPaginasVisibles = 5;
    
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginasVisibles / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginasVisibles - 1);
    
    if (fin - inicio + 1 < maxPaginasVisibles) {
      inicio = Math.max(1, fin - maxPaginasVisibles + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  get totalProductos(): number {
    return this.productosFiltrados.length;
  }

  getItemsMostrados(): string {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.totalProductos);
    return `${inicio}-${fin}`;
  }

  getNombreSubcategoria(subcategoriaId: number): string {
    const subcategoria = this.subcategorias.find(sub => sub.id === subcategoriaId);
    return subcategoria ? subcategoria.nombre : 'Subcategoría no encontrada';
  }

  toggleVariantesProducto(productoId: number): void {
    if (this.productoMostrandoVariantes === productoId) {
      this.productoMostrandoVariantes = null;
    } else {
      this.productoMostrandoVariantes = productoId;
      this.cargarVariantesProducto(productoId);
    }
  }

  cargarVariantesProducto(productoId: number): void {
    if (this.variantesProductos[productoId]) {
      return;
    }

    this.variantesService.getVariantesPorProducto(productoId).subscribe({
      next: (variantes) => {
        this.variantesProductos[productoId] = variantes.map(v => ({
          ...v,
          editando: false
        }));
      },
      error: (err) => {
        console.error('Error cargando variantes:', err);
        this.variantesProductos[productoId] = [];
      }
    });
  }

  filtrarPorSubcategoria(): void {
    this.cargarProductos();
  }

  trackByProductoId(index: number, prod: ProductoInventario): number {
    return prod.id;
  }

  trackByVarianteId(index: number, variante: Variante): number {
    return variante.id;
  }

  volverAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  parseToInt(value: string): number {
    return parseInt(value, 10);
  }

}