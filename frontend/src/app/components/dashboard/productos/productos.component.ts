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
  faSyncAlt,
  faLayerGroup,
  faMinus,
  faCaretDown,
  faCaretUp,
  faPen,
  faCheck,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

import { ProductosService } from '../../../services/productos.service';
import { SubcategoriasService } from '../../../services/subcategorias.service';
import { VariantesService } from '../../../services/variantes.service';
import { CrearVarianteDTO, ActualizarVarianteDTO, Variante, VarianteEditable } from '../../../models/variante.model';
import { ProductoEditable } from '../../../models/producto.model';
import { Subcategoria } from '../../../models/subcategoria.model';
import { AiService } from '../../../services/ai.service';
import { faMagic } from '@fortawesome/free-solid-svg-icons';

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
  faLayerGroup = faLayerGroup;
  faMinus = faMinus;
  faCaretDown = faCaretDown;
  faCaretUp = faCaretUp;
  faPen = faPen;
  faCheck = faCheck;
  faXmark = faXmark;
  faMagic = faMagic;

  // Propiedades del componente
  token: string | null = null;

  formProducto!: FormGroup;
  productos: ProductoEditable[] = [];
  productosFiltrados: ProductoEditable[] = [];
  productosPaginadas: ProductoEditable[] = [];
  subcategorias: Subcategoria[] = [];
  imagenSeleccionada: File | null = null;
  filtroSubcategoriaId: string = '';
  filtroCategoriaId: string = '';
  filtroOrden: string = 'recientes';
  categoriasDisponibles: {id: number, nombre: string}[] = [];
  
  // Propiedades de UI
  mostrarFormularioCrear: boolean = false;
  mostrarModalEdicion: boolean = false;
  productoEnEdicion: ProductoEditable | null = null;
  
  // Estados de IA
  generandoDescCrear: boolean = false;
  generandoDescEditar: boolean = false;
  sugiriendoSubcategoria: boolean = false;

  // Propiedades para variantes
  mostrarVariantesForm: boolean = false;
  variantesTemporales: CrearVarianteDTO[] = [];
  varianteTemporal: CrearVarianteDTO = {
    nombre: '',
    precio: 0,
    producto_id: 0
  };
  
  // Nuevas propiedades para gestión de variantes en tabla
  variantesProductos: { [productoId: number]: VarianteEditable[] } = {}; // Variantes editables por producto
  productoMostrandoVariantes: number | null = null; // Producto que está mostrando sus variantes
  nuevaVarianteProducto: { [productoId: number]: CrearVarianteDTO } = {}; // Nueva variante por producto

  // Propiedades para paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 5;
  totalPaginas: number = 1;
  searchTerm: string = '';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private productosService: ProductosService,
    private subcategoriasService: SubcategoriasService,
    private variantesService: VariantesService,
    private aiService: AiService,
    library: FaIconLibrary
  ) {
    library.addIcons(
      faEdit, faTrashAlt, faSave, faTimes, faPlus, faArrowLeft, faImage,
      faBoxes, faTag, faDollarSign, faFolder, faRuler, faAlignLeft,
      faUpload, faEraser, faFilter, faList, faSearch, faInbox,
      faChevronLeft, faChevronRight, faListAlt, faSyncAlt,
      faLayerGroup, faMinus, faCaretDown, faCaretUp, faPen, faCheck, faXmark, faMagic
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
        this.extraerCategoriasDisponibles();
      },
      error: err => {
        console.error('Error al cargar subcategorías:', err);
      }
    });
  }

  extraerCategoriasDisponibles(): void {
    const mapa = new Map<number, string>();
    this.subcategorias.forEach(s => {
      if (s.categoria_id && s.categoria) {
        mapa.set(s.categoria_id, s.categoria);
      }
    });
    this.categoriasDisponibles = Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }

  cargarProductos(resetPage: boolean = true): void {
    const id = this.filtroSubcategoriaId ? parseInt(this.filtroSubcategoriaId) : undefined;
    this.productosService.obtenerProductos(id).subscribe({
      next: data => {
        this.productos = data.map(p => ({
          ...p,
          editando: false,
          nuevaImagen: undefined
        }));
        this.filtrarProductos(resetPage);
      },
      error: err => {
        console.error('Error al cargar productos:', err);
      }
    });
  }

  // MÉTODOS DE UI
  toggleFormularioCrear(): void {
    this.mostrarFormularioCrear = !this.mostrarFormularioCrear;
  }

  // MÉTODOS PARA VARIANTES (CREACIÓN EN FORMULARIO)
  toggleVariantesForm(): void {
    this.mostrarVariantesForm = !this.mostrarVariantesForm;
    if (this.mostrarVariantesForm) {
      this.limpiarFormularioVariante();
    }
  }

  agregarVarianteTemporal(): void {
    if (!this.varianteTemporal.nombre.trim()) {
      Swal.fire('Error', 'El nombre de la variante es requerido', 'warning');
      return;
    }
    
    if (this.varianteTemporal.precio <= 0) {
      Swal.fire('Error', 'El precio debe ser mayor a 0', 'warning');
      return;
    }

    this.variantesTemporales.push({...this.varianteTemporal});
    this.limpiarFormularioVariante();
  }

  eliminarVarianteTemporal(index: number): void {
    this.variantesTemporales.splice(index, 1);
  }

  limpiarFormularioVariante(): void {
    this.varianteTemporal = {
      nombre: '',
      precio: 0,
      producto_id: 0
    };
  }

  // MÉTODOS PARA VARIANTES (GESTIÓN EN TABLA)
  toggleVariantesProducto(productoId: number): void {
    if (this.productoMostrandoVariantes === productoId) {
      this.productoMostrandoVariantes = null;
      // Limpiar formulario de nueva variante
      delete this.nuevaVarianteProducto[productoId];
    } else {
      this.productoMostrandoVariantes = productoId;
      // Inicializar formulario de nueva variante para este producto
      this.nuevaVarianteProducto[productoId] = {
        nombre: '',
        precio: 0,
        producto_id: productoId
      };
      
      if (!this.variantesProductos[productoId]) {
        this.cargarVariantesProducto(productoId);
      }
    }
  }

  cargarVariantesProducto(productoId: number): void {
    this.variantesService.getVariantesPorProducto(productoId).subscribe({
      next: (variantes) => {
        // Convertir a VarianteEditable para poder editar
        this.variantesProductos[productoId] = variantes.map(v => ({
          ...v,
          editando: false,
          precioOriginal: v.precio
        }));
      },
      error: (err) => {
        console.error('Error al cargar variantes:', err);
        Swal.fire('Error', 'No se pudieron cargar las variantes', 'error');
      }
    });
  }

  // Métodos para nueva variante en tabla
  inicializarNuevaVariante(productoId: number): void {
    this.nuevaVarianteProducto[productoId] = {
      nombre: '',
      precio: 0,
      producto_id: productoId
    };
  }

  crearVarianteEnTabla(productoId: number): void {
    if (!this.token) return;

    const nuevaVariante = this.nuevaVarianteProducto[productoId];
    
    if (!nuevaVariante.nombre.trim()) {
      Swal.fire('Error', 'El nombre de la variante es requerido', 'warning');
      return;
    }
    
    if (nuevaVariante.precio <= 0) {
      Swal.fire('Error', 'El precio debe ser mayor a 0', 'warning');
      return;
    }

    this.variantesService.crearVariante(this.token, nuevaVariante).subscribe({
      next: (response) => {
        Swal.fire('Éxito', 'Variante creada correctamente', 'success');
        // Limpiar formulario y recargar variantes
        this.inicializarNuevaVariante(productoId);
        this.cargarVariantesProducto(productoId);
      },
      error: (err) => {
        console.error('Error creando variante:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo crear la variante', 'error');
      }
    });
  }

  // Métodos para editar variante en tabla
  activarEdicionVariante(productoId: number, variante: VarianteEditable): void {
    // Cancelar cualquier otra edición en curso
    if (this.variantesProductos[productoId]) {
      this.variantesProductos[productoId].forEach(v => {
        if (v.id !== variante.id) {
          v.editando = false;
        }
      });
    }
    
    variante.editando = true;
    variante.precioOriginal = variante.precio;
  }

  cancelarEdicionVariante(variante: VarianteEditable): void {
    if (variante.precioOriginal !== undefined) {
      variante.precio = variante.precioOriginal;
    }
    variante.editando = false;
    variante.precioOriginal = undefined;
  }

  guardarEdicionVariante(productoId: number, variante: VarianteEditable): void {
    if (!this.token) return;

    const datosActualizar: ActualizarVarianteDTO = {
      nombre: variante.nombre,
      precio: variante.precio
    };

    // Validaciones
    if (!variante.nombre.trim()) {
      Swal.fire('Error', 'El nombre de la variante es requerido', 'warning');
      return;
    }
    
    if (variante.precio <= 0) {
      Swal.fire('Error', 'El precio debe ser mayor a 0', 'warning');
      return;
    }

    this.variantesService.actualizarVariante(this.token, variante.id, datosActualizar).subscribe({
      next: (response) => {
        variante.editando = false;
        variante.precioOriginal = undefined;
        Swal.fire('Éxito', 'Variante actualizada correctamente', 'success');
        
        // Actualizar con los datos del servidor
        if (response.variante) {
          variante.nombre = response.variante.nombre;
          variante.precio = response.variante.precio;
          variante.creado_en = response.variante.creado_en;
        }
      },
      error: (err) => {
        console.error('Error actualizando variante:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo actualizar la variante', 'error');
        this.cancelarEdicionVariante(variante);
      }
    });
  }

  eliminarVariante(productoId: number, varianteId: number): void {
    if (!this.token) return;

    Swal.fire({
      title: '¿Eliminar variante?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.variantesService.eliminarVariante(this.token!, varianteId).subscribe({
          next: () => {
            Swal.fire('Éxito', 'Variante eliminada correctamente', 'success');
            this.cargarVariantesProducto(productoId);
          },
          error: (err) => {
            console.error('Error eliminando variante:', err);
            Swal.fire('Error', 'No se pudo eliminar la variante', 'error');
          }
        });
      }
    });
  }

  // CREAR PRODUCTO CON VARIANTES
  crearProducto(): void {
    if (this.formProducto.invalid || !this.token) return;

    Swal.fire({
      title: 'Crear producto',
      text: this.variantesTemporales.length > 0 
        ? `Se creará el producto con ${this.variantesTemporales.length} variante(s)` 
        : 'Se creará el producto sin variantes',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f7b34',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.crearProductoConVariantes();
      }
    });
  }

  private crearProductoConVariantes(): void {
    const formValues = this.formProducto.value;
    const formData = new FormData();
    formData.append('nombre', formValues.nombre);
    formData.append('precio', formValues.precio);
    formData.append('descripcion', formValues.descripcion || '');
    formData.append('unidad', formValues.unidad);
    formData.append('subcategoria_id', formValues.subcategoria_id);
    if (this.imagenSeleccionada) {
      formData.append('imagen', this.imagenSeleccionada);
    }

    this.productosService.crearProducto(this.token!, formData).subscribe({
      next: (response) => {
        const productoId = response.id;
        
        // Crear variantes si hay
        if (this.variantesTemporales.length > 0) {
          this.crearVariantesParaNuevoProducto(productoId);
        } else {
          this.finalizarCreacionProducto();
        }
      },
      error: err => {
        Swal.fire('❌ Error', err.error?.error || 'No se pudo crear el producto.', 'error');
        console.error(err);
      }
    });
  }

  private crearVariantesParaNuevoProducto(productoId: number): void {
    // Crear cada variante
    const promesas = this.variantesTemporales.map(variante => {
      const varianteDTO: CrearVarianteDTO = {
        ...variante,
        producto_id: productoId
      };
      
      return new Promise<void>((resolve, reject) => {
        this.variantesService.crearVariante(this.token!, varianteDTO).subscribe({
          next: () => resolve(),
          error: (err) => reject(err)
        });
      });
    });

    // Ejecutar todas las promesas
    Promise.all(promesas)
      .then(() => {
        this.finalizarCreacionProducto();
      })
      .catch(err => {
        Swal.fire('⚠️ Producto creado con errores', 
          'El producto se creó pero algunas variantes no pudieron guardarse. ' + 
          'Puedes agregarlas manualmente.', 'warning');
        this.finalizarCreacionProducto();
      });
  }

  private finalizarCreacionProducto(): void {
    this.limpiarFormulario();
    this.variantesTemporales = [];
    this.mostrarVariantesForm = false;
    this.cargarProductos();
    Swal.fire('✅ Producto creado', 'El producto fue registrado correctamente.', 'success');
  }

  // Métodos para productos (sin cambios)
  filtrarProductos(resetPage: boolean = true): void {
    let filtrados = [...this.productos];

    // Filtro por término de búsqueda
    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase();
      filtrados = filtrados.filter(prod =>
        prod.nombre.toLowerCase().includes(termino) ||
        prod.descripcion?.toLowerCase().includes(termino) ||
        prod.id.toString().includes(termino)
      );
    }

    // Filtro por Categoría Principal
    if (this.filtroCategoriaId) {
      const catId = parseInt(this.filtroCategoriaId);
      // Solo mantener productos cuya subcategoría pertenezca a esta categoría
      const subcategoriasDeEstaCategoria = this.subcategorias
        .filter(s => s.categoria_id === catId)
        .map(s => s.id);
      filtrados = filtrados.filter(prod => subcategoriasDeEstaCategoria.includes(prod.subcategoria_id));
    }

    // Filtro por Subcategoría (solo si no estamos filtrando ya por ella en la API)
    if (this.filtroSubcategoriaId && this.filtroSubcategoriaId !== '') {
      const subId = parseInt(this.filtroSubcategoriaId);
      filtrados = filtrados.filter(prod => prod.subcategoria_id === subId);
    }

    // Ordenamiento
    switch (this.filtroOrden) {
      case 'recientes':
        filtrados.sort((a, b) => b.id - a.id);
        break;
      case 'antiguos':
        filtrados.sort((a, b) => a.id - b.id);
        break;
      case 'nombre_asc':
        filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'nombre_desc':
        filtrados.sort((a, b) => b.nombre.localeCompare(a.nombre));
        break;
      case 'precio_asc':
        filtrados.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio_desc':
        filtrados.sort((a, b) => b.precio - a.precio);
        break;
    }

    this.productosFiltrados = filtrados;
    
    if (resetPage) {
      this.paginaActual = 1;
    }
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

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Archivo muy grande', 'La imagen debe ser menor a 5MB', 'warning');
        return;
      }
      this.imagenSeleccionada = file;
    }
  }

  limpiarFormulario(): void {
    this.formProducto.reset();
    this.imagenSeleccionada = null;
    this.variantesTemporales = [];
    this.mostrarVariantesForm = false;
  }

  activarEdicion(prod: ProductoEditable): void {
    // Clona el producto para no mutar directamente la tabla antes de guardar
    this.productoEnEdicion = { ...prod, nuevaImagen: undefined };
    this.mostrarModalEdicion = true;
  }

  cerrarModalEdicion(): void {
    Swal.fire({
      title: '¿Cancelar edición?',
      text: 'Se descartarán los cambios no guardados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Seguir editando'
    }).then(result => {
      if (result.isConfirmed) {
        this.productoEnEdicion = null;
        this.mostrarModalEdicion = false;
      }
    });
  }

  guardarEdicionModal(): void {
    if (!this.productoEnEdicion || !this.token) return;

    // Validación básica
    if (!this.productoEnEdicion.nombre || !this.productoEnEdicion.precio || !this.productoEnEdicion.subcategoria_id) {
      Swal.fire('Campos incompletos', 'Asegúrate de llenar nombre, precio y subcategoría', 'warning');
      return;
    }

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
        const prod = this.productoEnEdicion!;
        const formData = new FormData();
        formData.append('nombre', prod.nombre);
        formData.append('precio', prod.precio.toString());
        formData.append('descripcion', prod.descripcion || '');
        formData.append('cantidad', prod.cantidad.toString());
        formData.append('subcategoria_id', prod.subcategoria_id.toString());
        formData.append('unidad', prod.unidad || 'unidad');
        if (prod.nuevaImagen) {
          formData.append('imagen', prod.nuevaImagen);
        }

        this.productosService.actualizarProducto(this.token!, prod.id, formData).subscribe({
          next: () => {
            this.productoEnEdicion = null;
            this.mostrarModalEdicion = false;
            this.cargarProductos(false);
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

  // ─── INTEGRACIÓN IA (GROQ) ────────────────────────────────────────────────────────

  generarDescripcionConIA(modo: 'crear' | 'editar'): void {
    if (!this.token) return;

    let nombreProducto = '';
    
    if (modo === 'crear') {
      nombreProducto = this.formProducto.get('nombre')?.value;
    } else if (modo === 'editar' && this.productoEnEdicion) {
      nombreProducto = this.productoEnEdicion.nombre;
    }

    if (!nombreProducto || nombreProducto.trim().length < 3) {
      Swal.fire('Nombre muy corto', 'Ingresa un nombre de producto más descriptivo antes de generar una descripción.', 'warning');
      return;
    }

    if (modo === 'crear') this.generandoDescCrear = true;
    if (modo === 'editar') this.generandoDescEditar = true;

    this.aiService.generarDescripcion(this.token, nombreProducto).subscribe({
      next: (res) => {
        if (modo === 'crear') {
          this.formProducto.patchValue({ descripcion: res.descripcion });
          this.generandoDescCrear = false;
        } else if (modo === 'editar' && this.productoEnEdicion) {
          this.productoEnEdicion.descripcion = res.descripcion;
          this.generandoDescEditar = false;
        }
        
        // Notificación Toast bonita
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: 'Descripción generada con IA' });
      },
      error: (err) => {
        console.error('Error generando descripción:', err);
        Swal.fire('Error', 'No se pudo generar la descripción con IA.', 'error');
        if (modo === 'crear') this.generandoDescCrear = false;
        if (modo === 'editar') this.generandoDescEditar = false;
      }
    });
  }

  sugerirSubcategoriaConIA(): void {
    if (!this.token || !this.productoEnEdicion) return;

    const nombreProducto = this.productoEnEdicion.nombre;
    const descripcionProducto = this.productoEnEdicion.descripcion || '';
    
    if (!nombreProducto || nombreProducto.trim().length < 3) {
      Swal.fire('Nombre muy corto', 'Ingresa un nombre de producto antes de sugerir la categoría.', 'warning');
      return;
    }

    this.sugiriendoSubcategoria = true;

    this.aiService.sugerirSubcategoria(this.token, nombreProducto, descripcionProducto, this.subcategorias).subscribe({
      next: (res) => {
        this.sugiriendoSubcategoria = false;
        if (res.subcategoria_id) {
          this.productoEnEdicion!.subcategoria_id = res.subcategoria_id;
          
          const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          });
          Toast.fire({ icon: 'success', title: 'Subcategoría asignada por IA' });
        } else {
          Swal.fire('Sin coincidencias', 'La IA no encontró una subcategoría clara para este producto. Por favor, selecciona una manualmente.', 'info');
        }
      },
      error: (err) => {
        this.sugiriendoSubcategoria = false;
        console.error('Error sugiriendo subcategoría:', err);
        Swal.fire('Error', 'Hubo un problema al contactar a la IA.', 'error');
      }
    });
  }

  eliminarProducto(id: number): void {
    if (!this.token) return;
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción eliminará también todas sus variantes.',
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
            this.cargarProductos(false);
            Swal.fire('✅ Eliminado', 'El producto y sus variantes han sido eliminados.', 'success');
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
      if (archivo.size > 5 * 1024 * 1024) {
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

  trackByVarianteId(index: number, variante: VarianteEditable): number {
    return variante.id;
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