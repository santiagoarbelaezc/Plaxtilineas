import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-promos',
  imports: [CommonModule],
  templateUrl: './card-promos.html',
  styleUrls: ['./card-promos.css']
})
export class CardPromos {
  @Input() titulo: string = '';
  @Input() descripcion: string = '';
  @Input() imagen: string = '';
  @Input() logoUrl: string = '';

  shouldBeTransparent(): boolean {
    // Verifica si descripción Y logo están vacíos (imagen puede tener valor)
    const isDescripcionEmpty = !this.descripcion || this.descripcion.trim() === '';
    const isLogoUrlEmpty = !this.logoUrl || this.logoUrl.trim() === '';
    
    return isDescripcionEmpty && isLogoUrlEmpty;
  }
}