import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosService } from '../../../services/productos.service';
import { SubcategoriasService } from '../../../services/subcategorias.service';
import { ProductoEditable } from '../../../models/producto.model';
import { Subcategoria } from '../../../models/subcategoria.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-productos-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  formProducto!: FormGroup;
  productos: ProductoEditable[] = [];
  subcategorias: Subcategoria[] = [];
  filtroSubcategoriaId: string = '';
  imagenSeleccionada: File | null = null;

  constructor(
    private fb: FormBuilder,
    private productosService: ProductosService,
    private subcategoriasService: SubcategoriasService
  ) {}

  ngOnInit(): void {
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
    this.subcategoriasService.getSubcategorias().subscribe((subs: Subcategoria[]) => {
      this.subcategorias = subs;
    });
  }

  cargarProductos(): void {
    const id = this.filtroSubcategoriaId ? parseInt(this.filtroSubcategoriaId) : undefined;
    this.productosService.obtenerProductos(id).subscribe((data: ProductoEditable[]) => {
      this.productos = data.map(p => ({ ...p, editando: false }));
    });
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imagenSeleccionada = file;
    }
  }

  crearProducto(): void {
    if (this.formProducto.invalid) return;
    const formValues = this.formProducto.value;
    const formData = new FormData();
    formData.append('nombre', formValues.nombre);
    formData.append('precio', formValues.precio);
    formData.append('descripcion', formValues.descripcion);
    formData.append('cantidad', formValues.unidad);
    formData.append('subcategoria_id', formValues.subcategoria_id);
    if (this.imagenSeleccionada) {
      formData.append('imagen', this.imagenSeleccionada);
    }
    this.productosService.crearProducto(formData).subscribe(() => {
      alert('✅ Producto creado');
      this.formProducto.reset();
      this.imagenSeleccionada = null;
      this.cargarProductos();
    });
  }

  editarProducto(producto: ProductoEditable): void {
    producto.editando = true;
  }

  actualizarProducto(producto: ProductoEditable): void {
    const formData = new FormData();
    formData.append('nombre', producto.nombre);
    formData.append('precio', producto.precio.toString());
    formData.append('descripcion', producto.descripcion);
    formData.append('cantidad', producto.cantidad.toString());
    formData.append('subcategoria_id', producto.subcategoria_id.toString());
    if (producto['nuevaImagen']) {
      formData.append('imagen', producto['nuevaImagen']);
    }
    this.productosService.actualizarProducto(producto.id, formData).subscribe(() => {
      alert('✅ Producto actualizado');
      this.cargarProductos();
    });
  }

  eliminarProducto(id: number): void {
    if (confirm('¿Eliminar este producto?')) {
      this.productosService.eliminarProducto(id).subscribe(() => {
        alert('✅ Producto eliminado');
        this.cargarProductos();
      });
    }
  }

  filtrarPorSubcategoria(): void {
    this.cargarProductos();
  }

  seleccionarNuevaImagen(event: any, producto: ProductoEditable): void {
    const archivo = event.target.files[0];
    if (archivo) {
      (producto as any)['nuevaImagen'] = archivo;
    }
  }

  trackByProductoId(index: number, item: ProductoEditable): number {
    return item.id;
  }
}