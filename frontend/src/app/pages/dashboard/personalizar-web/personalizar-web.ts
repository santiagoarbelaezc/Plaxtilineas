import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faLayerGroup,
  faEye,
  faEyeSlash,
  faDesktop,
  faTabletAlt,
  faMobileAlt,
  faSync,
  faArrowUp,
  faArrowDown,
  faPen,
  faTrash,
  faCheck,
  faPlus,
  faSearch,
  faExternalLinkAlt,
  faTimes,
  faImage,
  faBullhorn,
  faAlignLeft,
  faComments,
  faQuestionCircle,
  faImages,
  faShoppingBag,
  faFilter,
  faGlobe,
  faSlidersH,
  faCheckCircle,
  faExclamationCircle,
  faClock,
  faCloudUploadAlt,
  faBook
} from '@fortawesome/free-solid-svg-icons';
import { ComponentesService, ComponenteDinamico } from '../../../services/componentes.service';
import { CategoriasService } from '../../../services/categorias.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-personalizar-web',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './personalizar-web.html',
  styleUrls: ['./personalizar-web.css']
})
export class PersonalizarWeb implements OnInit {

  // Iconos FontAwesome
  faLayerGroup = faLayerGroup;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faDesktop = faDesktop;
  faTabletAlt = faTabletAlt;
  faMobileAlt = faMobileAlt;
  faSync = faSync;
  faArrowUp = faArrowUp;
  faArrowDown = faArrowDown;
  faPen = faPen;
  faTrash = faTrash;
  faCheck = faCheck;
  faPlus = faPlus;
  faSearch = faSearch;
  faExternalLinkAlt = faExternalLinkAlt;
  faTimes = faTimes;
  faImage = faImage;
  faBullhorn = faBullhorn;
  faAlignLeft = faAlignLeft;
  faComments = faComments;
  faQuestionCircle = faQuestionCircle;
  faImages = faImages;
  faShoppingBag = faShoppingBag;
  faFilter = faFilter;
  faGlobe = faGlobe;
  faSlidersH = faSlidersH;
  faCheckCircle = faCheckCircle;
  faExclamationCircle = faExclamationCircle;
  faClock = faClock;
  faCloudUploadAlt = faCloudUploadAlt;
  faBook = faBook;

  modalManualAbierto = false;

  abrirModalManual(): void {
    this.modalManualAbierto = true;
  }

  cerrarModalManual(): void {
    this.modalManualAbierto = false;
  }

  componentes: ComponenteDinamico[] = [];
  categoriasLista: any[] = [];
  cargando = true;
  error = '';
  mensajeExito = '';
  subiendoImagen = false;

  // ─── Filtros y búsqueda ─────────────────────────────
  filtroBusqueda: string = '';
  filtroEstado: 'todos' | 'activos' | 'inactivos' = 'todos';
  filtroZona: 'todas' | 'superior' | 'inferior' = 'todas';
  filtroTipo: string = 'todos';

  // ─── Vista previa iframe ────────────────────────────
  vistaPrevia = false;
  deviceMode: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  previewSafeUrl: SafeResourceUrl;
  private readonly PREVIEW_URL = 'http://localhost:4200/';

  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;

  // ─── Estado para la edición/creación ───────────────
  modalAbierto = false;
  editando = false;
  compSeleccionado: Partial<ComponenteDinamico> = {};

  // Modelos para formulario reactivo simple
  tempId?: number;
  tempTipo: 'banner' | 'anuncio' | 'texto' | 'testimonios' | 'faq' | 'galeria' | 'carrusel_productos' = 'banner';
  tempActivo = true;

  // Campos específicos de contenido
  cImageUrl = '';
  cTitulo = '';
  cSubtitulo = '';
  cTexto = '';
  cImageUrl2 = '';
  cTitulo2 = '';
  cTexto2 = '';
  cCuerpo = '';
  cLinkUrl = '';
  cAlineacion: 'left' | 'center' | 'right' = 'center';
  cBadge = '';
  cBtnText = '';
  cCaracteristicas = '';
  cPosicion: 'superior' | 'inferior' = 'superior';
  subiendoImagen2 = false;

  // Listas temporales para formularios dinámicos
  tempTestimonios: any[] = [];
  tempPreguntas: any[] = [];
  tempImagenes: any[] = [];
  tempCategoriaId: number | null = null;

  constructor(
    private componentesService: ComponentesService,
    private categoriasService: CategoriasService,
    private sanitizer: DomSanitizer
  ) {
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.PREVIEW_URL);
  }

  ngOnInit(): void {
    this.cargarComponentes();
    this.cargarCategorias();
  }

  // ─── Métodos del panel de vista previa ─────────────
  togglePreview(): void {
    this.vistaPrevia = !this.vistaPrevia;
    // Pequeño delay para que el iframe se renderice antes de cargar
    if (this.vistaPrevia) {
      setTimeout(() => this.recargarPreview(), 100);
    }
  }

  recargarPreview(): void {
    if (this.previewFrame?.nativeElement) {
      const frame = this.previewFrame.nativeElement;
      // Reasignar src fuerza recarga sin añadir historial
      frame.src = frame.src;
    } else {
      // Si el ViewChild aún no está disponible, forzar re-asignación de URL
      this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.PREVIEW_URL + '?t=' + Date.now()
      );
    }
  }

  setDevice(mode: 'desktop' | 'tablet' | 'mobile'): void {
    this.deviceMode = mode;
  }

  abrirEnNuevaPestana(): void {
    window.open(this.PREVIEW_URL, '_blank');
  }

  // ─── Carga de componentes ───────────────────────────
  cargarComponentes(): void {
    this.cargando = true;
    this.error = '';
    this.componentesService.getComponentes().subscribe({
      next: (res: any) => {
        this.componentes = res.data || res;
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los componentes dinámicos de la base de datos.';
        this.cargando = false;
        console.error(err);
      }
    });
  }

  // ─── Getters para estadísticas y filtros ────────────
  get totalSecciones(): number {
    return this.componentes.length;
  }

  get activasCount(): number {
    return this.componentes.filter(c => c.activo == 1 || c.activo === true).length;
  }

  get inactivasCount(): number {
    return this.componentes.filter(c => c.activo == 0 || c.activo === false).length;
  }

  get zonaSuperiorCount(): number {
    return this.componentes.filter(c => c.contenido?.posicion !== 'inferior').length;
  }

  get zonaInferiorCount(): number {
    return this.componentes.filter(c => c.contenido?.posicion === 'inferior').length;
  }

  get filteredComponentes(): ComponenteDinamico[] {
    return this.componentes.filter(comp => {
      // 1. Filtro por estado
      if (this.filtroEstado === 'activos' && !(comp.activo == 1 || comp.activo === true)) return false;
      if (this.filtroEstado === 'inactivos' && (comp.activo == 1 || comp.activo === true)) return false;

      // 2. Filtro por zona
      const pos = comp.contenido?.posicion === 'inferior' ? 'inferior' : 'superior';
      if (this.filtroZona !== 'todas' && pos !== this.filtroZona) return false;

      // 3. Filtro por tipo
      if (this.filtroTipo !== 'todos' && comp.tipo !== this.filtroTipo) return false;

      // 4. Búsqueda de texto
      if (this.filtroBusqueda.trim()) {
        const query = this.filtroBusqueda.toLowerCase().trim();
        const tipoMatch = (comp.tipo || '').toLowerCase().includes(query);
        const tipoLabelMatch = this.getTipoLabel(comp.tipo).toLowerCase().includes(query);
        const c = comp.contenido || {};
        const tituloMatch = (c.titulo || '').toLowerCase().includes(query);
        const subtituloMatch = (c.subtitulo || '').toLowerCase().includes(query);
        const descMatch = (c.descripcion || c.texto || c.cuerpo || '').toLowerCase().includes(query);
        return tipoMatch || tipoLabelMatch || tituloMatch || subtituloMatch || descMatch;
      }

      return true;
    });
  }

  getPosicionOriginal(comp: ComponenteDinamico): number {
    return this.componentes.findIndex(c => c.id === comp.id);
  }

  isFirstInGlobal(comp: ComponenteDinamico): boolean {
    return this.getPosicionOriginal(comp) === 0;
  }

  isLastInGlobal(comp: ComponenteDinamico): boolean {
    const idx = this.getPosicionOriginal(comp);
    return idx === this.componentes.length - 1;
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroEstado = 'todos';
    this.filtroZona = 'todas';
    this.filtroTipo = 'todos';
  }

  setFiltroEstado(estado: 'todos' | 'activos' | 'inactivos'): void {
    this.filtroEstado = estado;
  }

  setFiltroZona(zona: 'todas' | 'superior' | 'inferior'): void {
    this.filtroZona = zona;
  }

  setFiltroTipo(tipo: string): void {
    this.filtroTipo = tipo;
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'banner': return 'Banner Publicitario';
      case 'anuncio': return 'Anuncio / Novedades';
      case 'texto': return 'Bloque Informativo';
      case 'testimonios': return 'Testimonios & Clientes';
      case 'faq': return 'Preguntas Frecuentes';
      case 'galeria': return 'Galería Fotográfica';
      case 'carrusel_productos': return 'Carrusel de Catálogo';
      default: return tipo || 'Sección';
    }
  }

  // ─── Orden ─────────────────────────────────────────
  moverArriba(index: number, event: Event): void {
    event.stopPropagation();
    if (index === 0) return;
    const temp = this.componentes[index];
    this.componentes[index] = this.componentes[index - 1];
    this.componentes[index - 1] = temp;
    this.guardarOrden();
  }

  moverAbajo(index: number, event: Event): void {
    event.stopPropagation();
    if (index === this.componentes.length - 1) return;
    const temp = this.componentes[index];
    this.componentes[index] = this.componentes[index + 1];
    this.componentes[index + 1] = temp;
    this.guardarOrden();
  }

  moverCompArriba(comp: ComponenteDinamico, event: Event): void {
    event.stopPropagation();
    const index = this.getPosicionOriginal(comp);
    if (index <= 0) return;
    const temp = this.componentes[index];
    this.componentes[index] = this.componentes[index - 1];
    this.componentes[index - 1] = temp;
    this.guardarOrden();
  }

  moverCompAbajo(comp: ComponenteDinamico, event: Event): void {
    event.stopPropagation();
    const index = this.getPosicionOriginal(comp);
    if (index < 0 || index >= this.componentes.length - 1) return;
    const temp = this.componentes[index];
    this.componentes[index] = this.componentes[index + 1];
    this.componentes[index + 1] = temp;
    this.guardarOrden();
  }

  guardarOrden(): void {
    const ids = this.componentes.map(c => c.id).filter(id => id !== undefined) as number[];
    this.componentesService.reordenarComponentes(ids).subscribe({
      next: () => {
        this.mostrarMensaje('Secuencia de secciones actualizada en vivo');
      },
      error: (err) => {
        console.error('Error al guardar el nuevo orden:', err);
      }
    });
  }

  // ─── Toggle activo ──────────────────────────────────
  toggleActivo(comp: ComponenteDinamico, event: Event): void {
    event.stopPropagation();
    const nuevoEstado = comp.activo == 1 || comp.activo === true ? 0 : 1;
    if (comp.id) {
      this.componentesService.actualizarComponente(comp.id, { activo: nuevoEstado }).subscribe({
        next: () => {
          comp.activo = nuevoEstado;
          this.mostrarMensaje(`Sección ${nuevoEstado ? 'activada' : 'desactivada'} correctamente`);
        },
        error: (err) => console.error(err)
      });
    }
  }

  cargarCategorias(): void {
    this.categoriasService.getCategorias().subscribe({
      next: (cats) => {
        this.categoriasLista = cats;
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  // Métodos controladores de listas temporales
  addTestimonio() {
    this.tempTestimonios.push({ nombre: '', puesto: '', comentario: '', estrellas: 5, avatar: '' });
  }

  removeTestimonio(index: number) {
    this.tempTestimonios.splice(index, 1);
  }

  addPregunta() {
    this.tempPreguntas.push({ pregunta: '', respuesta: '' });
  }

  removePregunta(index: number) {
    this.tempPreguntas.splice(index, 1);
  }

  addImagen() {
    this.tempImagenes.push({ url: '', caption: '' });
  }

  removeImagen(index: number) {
    this.tempImagenes.splice(index, 1);
  }

  onItemFileSelected(event: any, item: any) {
    const file: File = event.target.files[0];
    if (file) {
      item.subiendo = true;
      this.componentesService.subirImagen(file).subscribe({
        next: (res) => {
          item.avatar = res.url;
          item.url = res.url;
          item.subiendo = false;
          this.mostrarMensaje('Imagen subida con éxito');
        },
        error: (err) => {
          item.subiendo = false;
          console.error(err);
          Swal.fire('Error', 'Error al subir la imagen.', 'error');
        }
      });
    }
  }

  abrirCreador(tipo: 'banner' | 'anuncio' | 'texto' | 'testimonios' | 'faq' | 'galeria' | 'carrusel_productos'): void {
    this.editando = false;
    this.tempTipo = tipo;
    this.tempActivo = true;
    this.cImageUrl = '';
    this.cTitulo = '';
    this.cSubtitulo = '';
    this.cTexto = '';
    this.cImageUrl2 = '';
    this.cTitulo2 = '';
    this.cTexto2 = '';
    this.subiendoImagen2 = false;
    this.cCuerpo = '';
    this.cLinkUrl = '';
    this.cAlineacion = 'center';
    this.cBadge = '⭐️ NOVEDAD DE LA SEMANA';
    this.cBtnText = 'Descubrir más →';
    this.cCaracteristicas = '';
    this.cPosicion = 'superior';

    // Limpiar listas
    this.tempTestimonios = [];
    this.tempPreguntas = [];
    this.tempImagenes = [];
    this.tempCategoriaId = null;

    this.modalAbierto = true;
  }

  abrirEditor(comp: ComponenteDinamico): void {
    this.editando = true;
    this.tempId = comp.id;
    this.tempTipo = comp.tipo;
    this.tempActivo = comp.activo == 1 || comp.activo === true;
    const content = comp.contenido || {};
    this.cImageUrl = content.imageUrl || '';
    this.cTitulo = content.titulo || '';
    this.cSubtitulo = content.subtitulo || '';
    this.cTexto = content.texto || '';
    this.cImageUrl2 = content.imageUrl2 || '';
    this.cTitulo2 = content.titulo2 || '';
    this.cTexto2 = content.texto2 || '';
    this.subiendoImagen2 = false;
    this.cCuerpo = content.cuerpo || '';
    this.cLinkUrl = content.linkUrl || '';
    this.cAlineacion = content.alineacion || 'center';
    this.cBadge = content.badge || '⭐️ NOVEDAD DE LA SEMANA';
    this.cBtnText = content.btnText || 'Descubrir más →';
    this.cCaracteristicas = content.caracteristicas || '';
    this.cPosicion = content.posicion || 'superior';

    // Cargar listas desde contenido
    this.tempTestimonios = Array.isArray(content.testimonios) ? JSON.parse(JSON.stringify(content.testimonios)) : [];
    this.tempPreguntas = Array.isArray(content.preguntas) ? JSON.parse(JSON.stringify(content.preguntas)) : [];
    this.tempImagenes = Array.isArray(content.imagenes) ? JSON.parse(JSON.stringify(content.imagenes)) : [];
    this.tempCategoriaId = content.categoriaId || null;

    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  onFileSelected(event: any, target: number = 1): void {
    const file: File = event.target.files[0];
    if (file) {
      if (target === 2) {
        this.subiendoImagen2 = true;
      } else {
        this.subiendoImagen = true;
      }
      this.componentesService.subirImagen(file).subscribe({
        next: (res) => {
          if (target === 2) {
            this.cImageUrl2 = res.url;
            this.subiendoImagen2 = false;
          } else {
            this.cImageUrl = res.url;
            this.subiendoImagen = false;
          }
          this.mostrarMensaje('Imagen subida con éxito a Cloudinary');
        },
        error: (err) => {
          if (target === 2) {
            this.subiendoImagen2 = false;
          } else {
            this.subiendoImagen = false;
          }
          console.error('Error al subir imagen:', err);
          Swal.fire('Error', 'Error al subir la imagen. Intenta de nuevo.', 'error');
        }
      });
    }
  }

  // ─── Guardar ────────────────────────────────────────
  guardarComponente(): void {
    let contenido: any = {};
    if (this.tempTipo === 'banner') {
      contenido = { imageUrl: this.cImageUrl, descripcion: this.cTexto, linkUrl: this.cLinkUrl, posicion: this.cPosicion };
    } else if (this.tempTipo === 'anuncio') {
      contenido = { 
        imageUrl: this.cImageUrl, 
        titulo: this.cTitulo, 
        texto: this.cTexto, 
        imageUrl2: this.cImageUrl2,
        titulo2: this.cTitulo2,
        texto2: this.cTexto2,
        linkUrl: this.cLinkUrl,
        badge: this.cBadge,
        btnText: this.cBtnText,
        caracteristicas: this.cCaracteristicas,
        posicion: this.cPosicion
      };
    } else if (this.tempTipo === 'texto') {
      contenido = { titulo: this.cTitulo, cuerpo: this.cCuerpo, alineacion: this.cAlineacion, posicion: this.cPosicion };
    } else if (this.tempTipo === 'testimonios') {
      contenido = { titulo: this.cTitulo, subtitulo: this.cSubtitulo, testimonios: this.tempTestimonios, posicion: this.cPosicion };
    } else if (this.tempTipo === 'faq') {
      contenido = { titulo: this.cTitulo, subtitulo: this.cSubtitulo, preguntas: this.tempPreguntas, posicion: this.cPosicion };
    } else if (this.tempTipo === 'galeria') {
      contenido = { titulo: this.cTitulo, subtitulo: this.cSubtitulo, imagenes: this.tempImagenes, posicion: this.cPosicion };
    } else if (this.tempTipo === 'carrusel_productos') {
      contenido = { titulo: this.cTitulo, subtitulo: this.cSubtitulo, categoriaId: this.tempCategoriaId, posicion: this.cPosicion };
    }

    const payload: Partial<ComponenteDinamico> = {
      tipo: this.tempTipo,
      activo: this.tempActivo ? 1 : 0,
      contenido: contenido
    };

    if (this.editando && this.tempId) {
      this.componentesService.actualizarComponente(this.tempId, payload).subscribe({
        next: () => {
          this.mostrarMensaje('Componente actualizado — recarga la vista previa para ver los cambios');
          this.cerrarModal();
          this.cargarComponentes();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.componentesService.crearComponente(payload).subscribe({
        next: () => {
          this.mostrarMensaje('Componente creado — recarga la vista previa para ver los cambios');
          this.cerrarModal();
          this.cargarComponentes();
        },
        error: (err) => console.error(err)
      });
    }
  }

  // ─── Eliminar ───────────────────────────────────────
  eliminarComponente(id: number, event: Event): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará este componente dinámico permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.componentesService.eliminarComponente(id).subscribe({
          next: () => {
            this.mostrarMensaje('Componente eliminado correctamente');
            this.cargarComponentes();
            Swal.fire('¡Eliminado!', 'El componente ha sido eliminado.', 'success');
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo eliminar el componente dinámico.', 'error');
          }
        });
      }
    });
  }

  // ─── Toast ──────────────────────────────────────────
  mostrarMensaje(msg: string): void {
    this.mensajeExito = msg;
    setTimeout(() => { this.mensajeExito = ''; }, 4000);
  }
}
