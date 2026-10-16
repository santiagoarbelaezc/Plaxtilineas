import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-banner.html',
  styleUrls: ['./card-banner.css']
})
export class CardBannerComponent {
  @Input() imagenUrl: string = '';
  @Input() titulo: string = '';
  @Input() descripcion: string = '';
  @Input() altText: string = 'Banner';
}