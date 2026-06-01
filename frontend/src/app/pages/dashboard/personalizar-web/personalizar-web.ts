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
  subiendoImagen = false;

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
          alert('Error al subir la imagen. Intenta de nuevo.');
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
