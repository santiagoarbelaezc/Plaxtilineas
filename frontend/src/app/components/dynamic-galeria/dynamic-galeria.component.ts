import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GaleriaItem {
  url: string;
  caption?: string;
}

interface GaleriaContenido {
  titulo?: string;
  subtitulo?: string;
  imagenes?: GaleriaItem[];
}

@Component({
  selector: 'app-dynamic-galeria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dynamic-galeria.component.html',
  styleUrls: ['./dynamic-galeria.component.css']
})
export class DynamicGaleriaComponent {
  @Input() contenido!: GaleriaContenido;

  lightboxOpen = false;
  activeImageIndex = 0;

  get listImagenes(): GaleriaItem[] {
    return this.contenido?.imagenes || [];
  }

  get activeImage(): GaleriaItem | null {
    const list = this.listImagenes;
    if (list.length === 0 || this.activeImageIndex < 0 || this.activeImageIndex >= list.length) {
      return null;
    }
    return list[this.activeImageIndex];
  }

  openLightbox(index: number) {
    this.activeImageIndex = index;
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.lightboxOpen = false;
  }

  nextImage(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    const list = this.listImagenes;
    if (list.length === 0) return;
    this.activeImageIndex = (this.activeImageIndex + 1) % list.length;
  }

  prevImage(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    const list = this.listImagenes;
    if (list.length === 0) return;
    this.activeImageIndex = (this.activeImageIndex - 1 + list.length) % list.length;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.lightboxOpen) return;
    
    if (event.key === 'ArrowRight') {
      this.nextImage();
    } else if (event.key === 'ArrowLeft') {
      this.prevImage();
    } else if (event.key === 'Escape') {
      this.closeLightbox();
    }
  }
}
