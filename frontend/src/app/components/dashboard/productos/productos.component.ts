import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
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
  faImage,
  faBoxes,
  faTag,
  faDollarSign,
  faFolder,
  faRuler,
  faAlignLeft,
  faUpload,
  faEraser,
  faFilter,
  faList,
  faSearch,
  faInbox,
  faChevronLeft,
  faChevronRight,
  faListAlt,
  faSyncAlt
} from '@fortawesome/free-solid-svg-icons';

import { ProductosService } from '../../../services/productos.service';
import { SubcategoriasService } from '../../../services/subcategorias.service';
import { ProductoEditable } from '../../../models/producto.model';
import { Subcategoria } from '../../../models/subcategoria.model';

@Component({
  selector: 'app-productos-component',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule, CurrencyPipe],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  // Propiedades para iconos
  faEdit = faEdit;
  faTrashAlt = faTrashAlt;
  faSave = faSave;
  faTimes = faTimes;
  faPlus = faPlus;
  faArrowLeft = faArrowLeft;
  faImage = faImage;
  faBoxes = faBoxes;
  faTag = faTag;
  faDollarSign = faDollarSign;
  faFolder = faFolder;
  faRuler = faRuler;
  faAlignLeft = faAlignLeft;
  faUpload = faUpload;
  faEraser = faEraser;
  faFilter = faFilter;
  faList = faList;
  faSearch = faSearch;
  faInbox = faInbox;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faListAlt = faListAlt;
  faSyncAlt = faSyncAlt;

  // Propiedades del componente
  token: string | null = null;

  formProducto!: FormGroup;
  productos: ProductoEditable[] = [];
  productosFiltrados: ProductoEditable[] = [];
  productosPaginadas: ProductoEditable[] = [];
  subcategorias: Subcategoria[] = [];
  imagenSeleccionada: File | null = null;
  filtroSubcategoriaId: string = '';
  
  // Propiedades para paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  searchTerm: string = '';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private productosService: ProductosService,
    private subcategoriasService: SubcategoriasService,
    library: FaIconLibrary
  ) {
    library.addIcons(
      faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft, faImage,
      faBoxes, faTag, faDollarSign, faFolder, faRuler, faAlignLeft,
      faUpload, faEraser, faFilter, faList, faSearch, faInbox,
      faChevronLeft, faChevronRight, faListAlt, faSyncAlt
    );
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
        this.filtrarProductos();
      },
      error: err => {
        console.error('Error al cargar productos:', err);
      }
    });
  }

  // Métodos para filtrado y paginación
  filtrarProductos(): void {
    if (this.searchTerm.trim() === '') {
      this.productosFiltrados = [...this.productos];
    } else {
      const termino = this.searchTerm.toLowerCase();
      this.productosFiltrados = this.productos.filter(prod =>
        prod.nombre.toLowerCase().includes(termino) ||
        prod.descripcion?.toLowerCase().includes(termino) ||
        prod.id.toString().includes(termino)
      );
    }
    
    this.paginaActual = 1; // Volver a la primera página al filtrar
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

  getNombreSubcategoriaFiltro(): string {
    if (!this.filtroSubcategoriaId) return '';
    const subcategoria = this.subcategorias.find(sub => sub.id.toString() === this.filtroSubcategoriaId);
    return subcategoria ? subcategoria.nombre : '';
  }

  // Métodos existentes (actualizados)
  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        Swal.fire('Archivo muy grande', 'La imagen debe ser menor a 5MB', 'warning');
        return;
      }
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
        this.limpiarFormulario();
        this.cargarProductos();
        Swal.fire('✅ Producto creado', 'El producto fue registrado correctamente.', 'success');
      },
      error: err => {
        Swal.fire('❌ Error', err.error?.error || 'No se pudo crear el producto.', 'error');
        console.error(err);
      }
    });
  }

  limpiarFormulario(): void {
    this.formProducto.reset();
    this.imagenSeleccionada = null;
  }

  activarEdicion(prod: ProductoEditable): void {
    prod.editando = true;
    this.productosFiltrados = [...this.productosFiltrados]; // Forzar redetección
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
        prod.nuevaImagen = undefined;
        this.cargarProductos(); // recarga desde BD
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
            prod.nuevaImagen = undefined;
            this.cargarProductos();
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
      if (archivo.size > 5 * 1024 * 1024) { // 5MB
        Swal.fire('Archivo muy grande', 'La imagen debe ser menor a 5MB', 'warning');
        return;
      }
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