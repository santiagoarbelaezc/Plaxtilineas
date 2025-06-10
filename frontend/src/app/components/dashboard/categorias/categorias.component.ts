import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoriasService } from '../../../services/categorias.service';
import { CategoriaEditable } from '../../../models/categoria.model';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faSave,
  faTimes,
  faPlus,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-categorias-component',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent implements OnInit {
  token: string | null = null;

  categoria = {
    nombre: '',
    icono: null as File | null
  };

  categorias: CategoriaEditable[] = [];

  constructor(
    private router: Router,
    private categoriaService: CategoriasService,
    library: FaIconLibrary
  ) {
    library.addIcons(faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft);
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
      },
      error: err => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.categoria.icono = input.files[0];
    }
  }

  crearCategoria(): void {
    const formData = new FormData();
    formData.append('nombre', this.categoria.nombre);
    if (this.categoria.icono) formData.append('icono', this.categoria.icono);

    this.categoriaService.crearCategoria(this.token!, formData).subscribe({
      next: () => {
        this.categoria = { nombre: '', icono: null };
        this.cargarCategorias();
      },
      error: err => {
        alert(err.error?.error || 'Error al crear');
        console.error('Error al crear categoría:', err);
      }
    });
  }

  eliminarCategoria(id: number): void {
    if (!confirm('¿Eliminar esta categoría?')) return;

    this.categoriaService.eliminarCategoria(this.token!, id).subscribe({
      next: () => this.cargarCategorias(),
      error: err => {
        alert('❌ No se pudo eliminar');
        console.error('Error al eliminar:', err);
      }
    });
  }

  actualizarCategoria(cat: CategoriaEditable): void {
    if (!cat.nombre.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', cat.nombre);
    if (cat.nuevoIcono) formData.append('icono', cat.nuevoIcono);

    this.categoriaService.actualizarCategoria(this.token!, cat.id, formData).subscribe({
      next: () => {
        cat.editando = false;
        cat.nuevoIcono = null;
        this.cargarCategorias();
      },
      error: err => {
        alert(err.error?.error || '❌ Error al actualizar');
        console.error('Error al actualizar:', err);
      }
    });
  }

  onCambiarIcono(cat: CategoriaEditable, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const archivo = input.files[0];
      if (!archivo.type.startsWith('image/')) {
        alert('El archivo debe ser una imagen');
        return;
      }
      cat.nuevoIcono = archivo;
    }
  }

  cancelarEdicion(cat: CategoriaEditable): void {
    cat.editando = false;
    cat.nuevoIcono = null;
  }

  volverAlDashboard(): void {
    this.router.navigate(['/admin']);
  }
}
