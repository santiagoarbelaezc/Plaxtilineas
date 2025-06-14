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
  faArrowLeft
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
  token: string | null = null;

  categorias: Categoria[] = [];
  subcategorias: SubcategoriaEditable[] = [];

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
    library.addIcons(faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft);
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
    next: data => (this.categorias = data),      error: err => console.error('Error al cargar categorías:', err)
});
}
cargarSubcategorias(): void {
    this.subcategoriasService.getSubcategorias().subscribe({
      next: data => {
        this.subcategorias = data.map(sub => ({
          ...sub,
          editando: false
        }));
      },
      error: err => console.error('Error al cargar subcategorías:', err)
    });
}
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
          this.subcategoria = { nombre: '', categoria_id: 0 };
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
