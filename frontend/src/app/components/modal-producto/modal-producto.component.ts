import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoMenu } from '../../models/productoMenu.model';

@Component({
  selector: 'app-modal-producto-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-producto.component.html',
  styleUrls: ['./modal-producto.component.css']
})
export class ModalProductoComponent implements OnInit {
  producto: ProductoMenu | null = null;

  ngOnInit(): void {
    window.addEventListener('abrir-modal-producto', (e: any) => {
      this.producto = e.detail;
    });
  }

  cerrarModal() {
    this.producto = null;
  }
}
