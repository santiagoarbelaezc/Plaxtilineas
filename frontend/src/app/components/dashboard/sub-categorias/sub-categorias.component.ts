import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faSave,
  faTimes,
  faPlus,
  faArrowLeft,
  faFolder,
  faFolderOpen,
  faTag,
  faEraser,
  faList,
  faSearch,
  faInbox,
  faChevronLeft,
  faChevronRight,
  faListAlt
} from '@fortawesome/free-solid-svg-icons';

import { CategoriasService } from '../../../services/categorias.service';
import { SubcategoriasService } from '../../../services/subcategorias.service';
import { Categoria } from '../../../models/categoria.model';
import { SubcategoriaEditable } from '../../../models/subcategoria.model';

@Component({
  selector: 'app-subcategorias-component',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './sub-categorias.component.html',
  styleUrls: ['./sub-categorias.component.css']
})
export class SubcategoriasComponent implements OnInit {
  // Propiedades para iconos
  faEdit = faEdit;
  faTrashAlt = faTrashAlt;
  faSave = faSave;
  faTimes = faTimes;
  faPlus = faPlus;
  faArrowLeft = faArrowLeft;
  faFolder = faFolder;
  faFolderOpen = faFolderOpen;
  faTag = faTag;
  faEraser = faEraser;
  faList = faList;
  faSearch = faSearch;
  faInbox = faInbox;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faListAlt = faListAlt;

  // Propiedades del componente
  token: string | null = null;

  categorias: Categoria[] = [];
  subcategorias: SubcategoriaEditable[] = [];
  subcategoriasFiltradas: SubcategoriaEditable[] = [];
  subcategoriasPaginadas: SubcategoriaEditable[] = [];

  // Propiedades para paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  searchTerm: string = '';

  subcategoria = {
    nombre: '',
    categoria_id: 0
  };

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    library: FaIconLibrary
  ) {
    library.addIcons(
      faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft,
      faFolder, faFolderOpen, faTag, faEraser, faList, faSearch,
      faInbox, faChevronLeft, faChevronRight, faListAlt
    );
  }

  ngOnInit(): void {
    this.token = localStorage.getItem('token');

    if (!this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargarCategorias();
    this.cargarSubcategorias();
  }

  cargarCategorias(): void {
    this.categoriasService.getCategorias().subscribe({
      next: data => (this.categorias = data),
      error: err => console.error('Error al cargar categorías:', err)
    });
  }

  cargarSubcategorias(): void {
    this.subcategoriasService.getSubcategorias().subscribe({
      next: data => {
        this.subcategorias = data.map(sub => ({
          ...sub,
          editando: false
        }));
        this.filtrarSubcategorias();
      },
      error: err => console.error('Error al cargar subcategorías:', err)
    });
  }

  // Métodos para filtrado y paginación
  filtrarSubcategorias(): void {
    if (this.searchTerm.trim() === '') {
      this.subcategoriasFiltradas = [...this.subcategorias];
    } else {
      const termino = this.searchTerm.toLowerCase();
      this.subcategoriasFiltradas = this.subcategorias.filter(sub =>
        sub.nombre.toLowerCase().includes(termino) ||
        this.getNombreCategoria(sub.categoria_id).toLowerCase().includes(termino) ||
        sub.id.toString().includes(termino)
      );
    }
    
    this.paginaActual = 1; // Volver a la primera página al filtrar
    this.calcularPaginacion();
    this.actualizarDatosPaginados();
  }

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.subcategoriasFiltradas.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = this.totalPaginas;
    }
  }

  actualizarDatosPaginados(): void {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.subcategoriasPaginadas = this.subcategoriasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarDatosPaginados();
    }
  }

  cambiarItemsPorPagina(): void {
    this.paginaActual = 1;
    this.calcularPaginacion();
    this.actualizarDatosPaginados();
  }

  getRangoPaginas(): number[] {
    const paginas: number[] = [];
    const maxPaginasVisibles = 5;
    
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginasVisibles / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginasVisibles - 1);
    
    // Ajustar si estamos cerca del inicio
    if (fin - inicio + 1 < maxPaginasVisibles) {
      inicio = Math.max(1, fin - maxPaginasVisibles + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  get totalSubcategorias(): number {
    return this.subcategoriasFiltradas.length;
  }

  getItemsMostrados(): string {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.totalSubcategorias);
    return `${inicio}-${fin}`;
  }

  getNombreCategoria(categoriaId: number): string {
    const categoria = this.categorias.find(cat => cat.id === categoriaId);
    return categoria ? categoria.nombre : 'Categoría no encontrada';
  }

  // Métodos existentes (actualizados)
  crearSubcategoria(): void {
    if (!this.subcategoria.nombre.trim() || !this.subcategoria.categoria_id) {
      Swal.fire('Campos obligatorios', 'Todos los campos son requeridos.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Crear subcategoría?',
      text: 'Se registrará una nueva subcategoría en el sistema.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f7b34',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        const data = {
          nombre: this.subcategoria.nombre,
          categoria_id: this.subcategoria.categoria_id
        };

        this.subcategoriasService.crearSubcategoria(this.token!, data).subscribe({
          next: () => {
            this.limpiarFormulario();
            this.cargarSubcategorias();
            Swal.fire('✅ Subcategoría creada', 'La subcategoría fue registrada correctamente.', 'success');
          },
          error: err => {
            Swal.fire('❌ Error', err.error?.error || 'Error al crear subcategoría', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  actualizarSubcategoria(sub: SubcategoriaEditable): void {
    if (!sub.nombre.trim()) {
      Swal.fire('Campo vacío', 'El nombre no puede estar vacío.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Guardar cambios?',
      text: 'Se actualizará la subcategoría seleccionada.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f7b34',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        const data = {
          nombre: sub.nombre,
          categoria_id: sub.categoria_id
        };

        this.subcategoriasService.actualizarSubcategoria(this.token!, sub.id, data).subscribe({
          next: () => {
            sub.editando = false;
            this.cargarSubcategorias();
            Swal.fire('✅ Actualizado', 'La subcategoría fue actualizada correctamente.', 'success');
          },
          error: err => {
            Swal.fire('❌ Error', err.error?.error || 'Error al actualizar', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  eliminarSubcategoria(id: number): void {
    Swal.fire({
      title: '¿Eliminar subcategoría?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.subcategoriasService.eliminarSubcategoria(this.token!, id).subscribe({
          next: () => {
            this.cargarSubcategorias();
            Swal.fire('Eliminada', 'La subcategoría ha sido eliminada.', 'success');
          },
          error: err => {
            Swal.fire('Error', '❌ No se pudo eliminar la subcategoría.', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  cancelarEdicion(sub: SubcategoriaEditable): void {
    Swal.fire({
      title: '¿Cancelar edición?',
      text: 'Se descartarán los cambios realizados en esta subcategoría.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver'
    }).then(result => {
      if (result.isConfirmed) {
        sub.editando = false;
        this.cargarSubcategorias();
      }
    });
  }

  limpiarFormulario(): void {
    this.subcategoria = { nombre: '', categoria_id: 0 };
  }

  volverAlDashboard(): void {
    Swal.fire({
      title: '¿Volver al Dashboard?',
      text: 'Se perderán los cambios no guardados.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f7b34',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, volver',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate(['/admin']);
      }
    });
  }
}