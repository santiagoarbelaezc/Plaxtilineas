import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  faImage
} from '@fortawesome/free-solid-svg-icons';

import { ProductosService } from '../../../services/productos.service';
import { SubcategoriasService } from '../../../services/subcategorias.service';
import { ProductoEditable } from '../../../models/producto.model';
import { Subcategoria } from '../../../models/subcategoria.model';

@Component({
  selector: 'app-productos-component',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  token: string | null = null;

  formProducto!: FormGroup;
  productos: ProductoEditable[] = [];
  subcategorias: Subcategoria[] = [];
  imagenSeleccionada: File | null = null;
  filtroSubcategoriaId: string = '';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private productosService: ProductosService,
    private subcategoriasService: SubcategoriasService,
    library: FaIconLibrary
  ) {
    library.addIcons(faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft, faImage);
  }

  ngOnInit(): void {
    this.token = localStorage.getItem('token');
    if (!this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.formProducto = this.fb.group({
      nombre: ['', Validators.required],
      precio: ['', [Validators.required, Validators.min(0)]],
      descripcion: [''],
      subcategoria_id: ['', Validators.required],
      unidad: ['', Validators.required]
    });

    this.cargarSubcategorias();
    this.cargarProductos();
  }

  cargarSubcategorias(): void {
    this.subcategoriasService.getSubcategorias().subscribe({
      next: subs => {
        this.subcategorias = subs;
      },
      error: err => {
        console.error('Error al cargar subcategorías:', err);
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
          nuevaImagen: undefined
        }));
      },
      error: err => {
        console.error('Error al cargar productos:', err);
      }
    });
  }

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.imagenSeleccionada = file;
    }
  }

  crearProducto(): void {
    if (this.formProducto.invalid || !this.token) return;

    const formValues = this.formProducto.value;
    const formData = new FormData();
    formData.append('nombre', formValues.nombre);
    formData.append('precio', formValues.precio);
    formData.append('descripcion', formValues.descripcion || '');
    formData.append('cantidad', formValues.unidad);
    formData.append('subcategoria_id', formValues.subcategoria_id);
    if (this.imagenSeleccionada) {
      formData.append('imagen', this.imagenSeleccionada);
    }

    this.productosService.crearProducto(this.token, formData).subscribe({
      next: () => {
        this.formProducto.reset();
        this.imagenSeleccionada = null;
        this.cargarProductos();
        Swal.fire('✅ Producto creado', 'El producto fue registrado correctamente.', 'success');
      },
      error: err => {
        Swal.fire('❌ Error', err.error?.error || 'No se pudo crear el producto.', 'error');
        console.error(err);
      }
    });
  }

  activarEdicion(prod: ProductoEditable): void {
    prod.editando = true;
    this.productos = [...this.productos]; // Forzar redetección
  }

  cancelarEdicion(prod: ProductoEditable): void {
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
        prod.editando = false;
        prod['nuevaImagen'] = undefined;        this.cargarProductos(); // recarga desde BD
      }
    });
  }

  actualizarProducto(prod: ProductoEditable): void {
    if (!this.token) return;

    Swal.fire({
      title: '¿Guardar cambios?',
      text: 'Se actualizará la información del producto.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f7b34',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        const formData = new FormData();
        formData.append('nombre', prod.nombre);
        formData.append('precio', prod.precio.toString());
        formData.append('descripcion', prod.descripcion || '');
        formData.append('cantidad', prod.cantidad.toString());
        formData.append('subcategoria_id', prod.subcategoria_id.toString());
        if (prod.nuevaImagen) {
          formData.append('imagen', prod.nuevaImagen);
        }

        this.productosService.actualizarProducto(this.token!, prod.id, formData).subscribe({
          next: () => {
            prod.editando = false;
            prod['nuevaImagen'] = undefined;            this.cargarProductos();
            Swal.fire('✅ Actualizado', 'El producto fue actualizado correctamente.', 'success');
          },
          error: err => {
            Swal.fire('❌ Error', err.error?.error || 'No se pudo actualizar.', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  eliminarProducto(id: number): void {
    if (!this.token) return;
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.productosService.eliminarProducto(this.token!, id).subscribe({
          next: () => {
            this.cargarProductos();
            Swal.fire('✅ Eliminado', 'El producto ha sido eliminado.', 'success');
          },
          error: err => {
            Swal.fire('❌ Error', 'No se pudo eliminar el producto.', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  seleccionarNuevaImagen(event: any, prod: ProductoEditable): void {
    const archivo = event.target.files?.[0];
    if (archivo) {
      prod.nuevaImagen = archivo;
    }
  }

  filtrarPorSubcategoria(): void {
    this.cargarProductos();
  }

  trackByProductoId(index: number, prod: ProductoEditable): number {
    return prod.id;
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
