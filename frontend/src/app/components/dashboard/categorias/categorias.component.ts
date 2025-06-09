import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-categorias-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent {
  categoria = {
    nombre: '',
    icono: null as File | null
  };

  categorias: any[] = [];

  crearCategoria(): void {
    if (!this.categoria.nombre || !this.categoria.icono) return;

    const nuevaCategoria = {
      id: Date.now(),
      nombre: this.categoria.nombre,
      iconoUrl: URL.createObjectURL(this.categoria.icono)
    };

    this.categorias.push(nuevaCategoria);

    // Limpiar formulario
    this.categoria = { nombre: '', icono: null };
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.categoria.icono = input.files[0];
    }
  }

  editarCategoria(cat: any): void {
    // Lógica de edición futura
    alert(`Editar categoría: ${cat.nombre}`);
  }

  eliminarCategoria(id: number): void {
    this.categorias = this.categorias.filter(cat => cat.id !== id);
  }
}
