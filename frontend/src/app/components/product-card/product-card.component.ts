import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoMenu } from '../../models/productoMenu.model';

@Component({
  selector: 'app-product-card-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input() producto!: ProductoMenu;

  abrirModal() {
    const evento = new CustomEvent('abrir-modal-producto', { detail: this.producto });
    window.dispatchEvent(evento);
  }
}
