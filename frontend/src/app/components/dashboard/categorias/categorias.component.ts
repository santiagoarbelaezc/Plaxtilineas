import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CategoriasService } from '../../../services/categorias.service';
import { CategoriaEditable } from '../../../models/categoria.model';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faSave,
  faTimes,
  faPlus,
  faArrowLeft,
  faHome,
  faFolderOpen,
  faFolder,
  faBoxes,
  faTag,
  faImage,
  faUpload,
  faEraser,
  faList,
  faSearch,
  faInbox,
  faSyncAlt,
  faChevronLeft,
  faChevronRight,
  faListAlt
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-categorias-component',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent implements OnInit {
  // Propiedades para iconos
  faEdit = faEdit;
  faTrashAlt = faTrashAlt;
  faSave = faSave;
  faTimes = faTimes;
  faPlus = faPlus;
  faArrowLeft = faArrowLeft;
  faHome = faHome;
  faFolderOpen = faFolderOpen;
  faFolder = faFolder;
  faBoxes = faBoxes;
  faTag = faTag;
  faImage = faImage;
  faUpload = faUpload;
  faEraser = faEraser;
  faList = faList;
  faSearch = faSearch;
  faInbox = faInbox;
  faSyncAlt = faSyncAlt;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faListAlt = faListAlt;

  // Propiedades del componente
  token: string | null = null;
  
  categoria = {
    nombre: '',
    icono: null as File | null
  };

  categorias: CategoriaEditable[] = [];
  categoriasFiltradas: CategoriaEditable[] = [];
  categoriasPaginadas: CategoriaEditable[] = [];
  
  // Propiedades para paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 5;
  totalPaginas: number = 1;
  searchTerm: string = '';

  constructor(
    private router: Router,
    private categoriaService: CategoriasService,
    library: FaIconLibrary
  ) {
    // Agregar todos los iconos a la librería
    library.addIcons(
      faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft,
      faHome, faFolderOpen, faFolder, faBoxes, faTag, faImage,
      faUpload, faEraser, faList, faSearch, faInbox, faSyncAlt,
      faChevronLeft, faChevronRight, faListAlt
    );
  }

  ngOnInit(): void {
    this.token = localStorage.getItem('token');

    if (!this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargarCategorias();
  }

  cargarCategorias(): void {
    this.categoriaService.getCategorias().subscribe({
      next: data => {
        this.categorias = data.map(cat => ({
          ...cat,
          editando: false,
          nuevoIcono: null
        }));
        this.filtrarCategorias();
      },
      error: err => {
        console.error('Error al cargar categorías:', err);
        Swal.fire('Error', 'No se pudieron cargar las categorías', 'error');
      }
    });
  }

  // Métodos para filtrado y paginación
  filtrarCategorias(): void {
    if (this.searchTerm.trim() === '') {
      this.categoriasFiltradas = [...this.categorias];
    } else {
      const termino = this.searchTerm.toLowerCase();
      this.categoriasFiltradas = this.categorias.filter(cat =>
        cat.nombre.toLowerCase().includes(termino) ||
        cat.id.toString().includes(termino)
      );
    }
    
    this.paginaActual = 1; // Volver a la primera página al filtrar
    this.calcularPaginacion();
    this.actualizarDatosPaginados();
  }

  calcularPaginacion(): void {
    const perPage = Number(this.itemsPorPagina) || 5;
    this.totalPaginas = Math.ceil(this.categoriasFiltradas.length / perPage);
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = this.totalPaginas;
    }
  }

  actualizarDatosPaginados(): void {
    const perPage = Number(this.itemsPorPagina) || 5;
    const inicio = (this.paginaActual - 1) * perPage;
    const fin = inicio + perPage;
    this.categoriasPaginadas = this.categoriasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.itemsPorPagina = Number(this.itemsPorPagina) || 5;
      this.paginaActual = pagina;
      this.actualizarDatosPaginados();
    }
  }

  cambiarItemsPorPagina(): void {
    this.itemsPorPagina = Number(this.itemsPorPagina) || 5;
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

  get totalCategorias(): number {
    return this.categoriasFiltradas.length;
  }

  getItemsMostrados(): string {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.totalCategorias);
    return `${inicio}-${fin}`;
  }

  // Métodos existentes (actualizados para trabajar con la lista filtrada)
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB
        Swal.fire('Archivo muy grande', 'El archivo debe ser menor a 2MB', 'warning');
        return;
      }
      this.categoria.icono = file;
    }
  }

  crearCategoria(): void {
    if (!this.categoria.nombre.trim()) {
      Swal.fire('Campo obligatorio', 'El nombre de la categoría es requerido.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Crear categoría?',
      text: 'Se agregará una nueva categoría al sistema.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f7b34',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        const formData = new FormData();
        formData.append('nombre', this.categoria.nombre);
        if (this.categoria.icono) formData.append('icono', this.categoria.icono);

        this.categoriaService.crearCategoria(this.token!, formData).subscribe({
          next: () => {
            this.categoria = { nombre: '', icono: null };
            this.cargarCategorias();
            Swal.fire('✅ Categoría creada', 'La categoría fue registrada correctamente.', 'success');
          },
          error: err => {
            Swal.fire('❌ Error', err.error?.error || 'Error al crear', 'error');
            console.error('Error al crear categoría:', err);
          }
        });
      }
    });
  }

  eliminarCategoria(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará la categoría permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoriaService.eliminarCategoria(this.token!, id).subscribe({
          next: () => {
            this.cargarCategorias();
            Swal.fire('¡Eliminada!', 'La categoría ha sido eliminada.', 'success');
          },
          error: err => {
            Swal.fire('Error', 'No se pudo eliminar la categoría.', 'error');
            console.error('Error al eliminar:', err);
          }
        });
      }
    });
  }

  actualizarCategoria(cat: CategoriaEditable): void {
    if (!cat.nombre.trim()) {
      Swal.fire('Campo vacío', 'El nombre no puede estar vacío.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Guardar cambios?',
      text: 'Se actualizará la información de la categoría.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f7b34',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        const formData = new FormData();
        formData.append('nombre', cat.nombre);
        if (cat.nuevoIcono) formData.append('icono', cat.nuevoIcono);

        this.categoriaService.actualizarCategoria(this.token!, cat.id, formData).subscribe({
          next: () => {
            cat.editando = false;
            cat.nuevoIcono = null;
            this.cargarCategorias();
            Swal.fire('✅ Actualizado', 'La categoría fue actualizada correctamente.', 'success');
          },
          error: err => {
            Swal.fire('❌ Error', err.error?.error || 'Error al actualizar', 'error');
            console.error('Error al actualizar:', err);
          }
        });
      }
    });
  }

  onCambiarIcono(cat: CategoriaEditable, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const archivo = input.files[0];
      if (!archivo.type.startsWith('image/')) {
        Swal.fire('Archivo no válido', 'El archivo debe ser una imagen.', 'warning');
        return;
      }
      if (archivo.size > 2 * 1024 * 1024) {
        Swal.fire('Archivo muy grande', 'El archivo debe ser menor a 2MB', 'warning');
        return;
      }
      cat.nuevoIcono = archivo;
    }
  }

  cancelarEdicion(cat: CategoriaEditable): void {
    Swal.fire({
      title: '¿Cancelar edición?',
      text: 'Se descartarán los cambios realizados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver'
    }).then(result => {
      if (result.isConfirmed) {
        cat.editando = false;
        cat.nuevoIcono = null;
      }
    });
  }

  limpiarFormulario(): void {
    this.categoria = { nombre: '', icono: null };
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