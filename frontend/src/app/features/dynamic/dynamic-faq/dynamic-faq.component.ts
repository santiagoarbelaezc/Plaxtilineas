import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FAQItem {
  pregunta: string;
  respuesta: string;
  isOpen?: boolean;
}

interface FAQContenido {
  titulo?: string;
  subtitulo?: string;
  preguntas?: FAQItem[];
}

@Component({
  selector: 'app-dynamic-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dynamic-faq.component.html',
  styleUrls: ['./dynamic-faq.component.css']
})
export class DynamicFaqComponent {
  @Input() contenido!: FAQContenido;

  searchText = '';

  get listPreguntas(): FAQItem[] {
    const raw = this.contenido?.preguntas || [];
    if (!this.searchText.trim()) {
      return raw;
    }
    const filter = this.searchText.toLowerCase();
    return raw.filter(item => 
      item.pregunta.toLowerCase().includes(filter) || 
      item.respuesta.toLowerCase().includes(filter)
    );
  }

  toggleItem(item: FAQItem) {
    item.isOpen = !item.isOpen;
  }
}
