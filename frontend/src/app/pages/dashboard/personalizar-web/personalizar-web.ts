import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ComponentesService, ComponenteDinamico } from '../../../services/componentes.service';

@Component({
  selector: 'app-personalizar-web',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './personalizar-web.html',
  styleUrls: ['./personalizar-web.css']
})
export class PersonalizarWeb implements OnInit {

  componentes: ComponenteDinamico[] = [];
  cargando = true;
  error = '';
  mensajeExito = '';

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
  tempTipo: 'banner' | 'anuncio' | 'texto' = 'banner';
  tempActivo = true;

  // Campos específicos de contenido
  cImageUrl = '';
  cTitulo = '';
  cSubtitulo = '';
  cTexto = '';
  cCuerpo = '';
  cLinkUrl = '';
  cAlineacion: 'left' | 'center' | 'right' = 'center';

  constructor(
    private componentesService: ComponentesService,
    private sanitizer: DomSanitizer
  ) {
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.PREVIEW_URL);
  }

  ngOnInit(): void {
    this.cargarComponentes();
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

  guardarOrden(): void {
    const ids = this.componentes.map(c => c.id).filter(id => id !== undefined) as number[];
    this.componentesService.reordenarComponentes(ids).subscribe({
      next: () => {
        this.mostrarMensaje('Orden actualizado correctamente');
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
          this.mostrarMensaje(`Componente ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
        },
        error: (err) => console.error(err)
      });
    }
  }

  // ─── Modal de creación ──────────────────────────────
  abrirCreador(tipo: 'banner' | 'anuncio' | 'texto'): void {
    this.editando = false;
    this.tempTipo = tipo;
    this.tempActivo = true;
    this.cImageUrl = '';
    this.cTitulo = '';
    this.cSubtitulo = '';
    this.cTexto = '';
    this.cCuerpo = '';
    this.cLinkUrl = '';
    this.cAlineacion = 'center';
    this.modalAbierto = true;
  }

  // ─── Modal de edición ───────────────────────────────
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
    this.cCuerpo = content.cuerpo || '';
    this.cLinkUrl = content.linkUrl || '';
    this.cAlineacion = content.alineacion || 'center';
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  // ─── Guardar ────────────────────────────────────────
  guardarComponente(): void {
    let contenido: any = {};
    if (this.tempTipo === 'banner') {
      contenido = { imageUrl: this.cImageUrl, descripcion: this.cTexto, linkUrl: this.cLinkUrl };
    } else if (this.tempTipo === 'anuncio') {
      contenido = { imageUrl: this.cImageUrl, titulo: this.cTitulo, texto: this.cTexto, linkUrl: this.cLinkUrl };
    } else if (this.tempTipo === 'texto') {
      contenido = { titulo: this.cTitulo, cuerpo: this.cCuerpo, alineacion: this.cAlineacion };
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
    if (confirm('¿Estás seguro de que deseas eliminar este componente dinámico? Esta acción no se puede deshacer.')) {
      this.componentesService.eliminarComponente(id).subscribe({
        next: () => {
          this.mostrarMensaje('Componente eliminado correctamente');
          this.cargarComponentes();
        },
        error: (err) => console.error(err)
      });
    }
  }

  // ─── Toast ──────────────────────────────────────────
  mostrarMensaje(msg: string): void {
    this.mensajeExito = msg;
    setTimeout(() => { this.mensajeExito = ''; }, 4000);
  }
}
