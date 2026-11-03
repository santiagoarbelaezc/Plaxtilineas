import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TestimonioItem {
  nombre: string;
  puesto?: string;
  comentario: string;
  estrellas: number;
  avatar?: string;
}

interface TestimoniosContenido {
  titulo?: string;
  subtitulo?: string;
  testimonios?: TestimonioItem[];
}

@Component({
  selector: 'app-dynamic-testimonios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dynamic-testimonios.component.html',
  styleUrls: ['./dynamic-testimonios.component.css']
})
export class DynamicTestimoniosComponent {
  @Input() contenido!: TestimoniosContenido;

  currentIndex = 0;

  get listTestimonios(): TestimonioItem[] {
    return this.contenido?.testimonios || [];
  }

  getStarsArray(count: number): number[] {
    return Array(Math.round(count || 5)).fill(0);
  }

  next() {
    if (this.listTestimonios.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.listTestimonios.length;
  }

  prev() {
    if (this.listTestimonios.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.listTestimonios.length) % this.listTestimonios.length;
  }

  setIndex(index: number) {
    this.currentIndex = index;
  }
}
