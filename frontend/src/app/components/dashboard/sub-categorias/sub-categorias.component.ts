import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
      },
      error: err => console.error('Error al cargar subcategorías:', err)
    });
  }

  crearSubcategoria(): void {
    if (!this.subcategoria.nombre.trim() || !this.subcategoria.categoria_id) {
      alert('Todos los campos son obligatorios');
      return;
    }

    const data = {
      nombre: this.subcategoria.nombre,
      categoria_id: this.subcategoria.categoria_id
    };

    this.subcategoriasService.crearSubcategoria(this.token!, data).subscribe({
      next: () => {
        this.subcategoria = { nombre: '', categoria_id: 0 };
        this.cargarSubcategorias();
      },
      error: err => {
        alert(err.error?.error || '❌ Error al crear subcategoría');
        console.error(err);
      }
    });
  }

  actualizarSubcategoria(sub: SubcategoriaEditable): void {
    if (!sub.nombre.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    const data = {
      nombre: sub.nombre,
      categoria_id: sub.categoria_id
    };

    this.subcategoriasService.actualizarSubcategoria(this.token!, sub.id, data).subscribe({
      next: () => {
        sub.editando = false;
        this.cargarSubcategorias();
      },
      error: err => {
        alert(err.error?.error || '❌ Error al actualizar');
        console.error(err);
      }
    });
  }

  eliminarSubcategoria(id: number): void {
    if (!confirm('¿Eliminar esta subcategoría?')) return;

    this.subcategoriasService.eliminarSubcategoria(this.token!, id).subscribe({
      next: () => this.cargarSubcategorias(),
      error: err => {
        alert('❌ No se pudo eliminar');
        console.error(err);
      }
    });
  }

  cancelarEdicion(sub: SubcategoriaEditable): void {
    sub.editando = false;
    this.cargarSubcategorias();
  }

  volverAlDashboard(): void {
    this.router.navigate(['/admin']);
  }
}
