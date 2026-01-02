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
}