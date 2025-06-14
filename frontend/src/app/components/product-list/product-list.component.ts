import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductoMenu } from '../../models/productoMenu.model';
import { ProductoMenuService } from '../../services/producto-menu.service';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-list-component',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  productos: ProductoMenu[] = [];
  cargando = false;

  constructor(
    private route: ActivatedRoute,
    private productoService: ProductoMenuService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const subcatId = parseInt(params['subcategoria_id']);
      if (!isNaN(subcatId)) {
        this.cargarProductos(subcatId);
      }
    });
  }

  cargarProductos(subcatId: number) {
    this.cargando = true;
    this.productoService.obtenerPorSubcategoria(subcatId).subscribe({
      next: data => {
        this.productos = data;
        this.cargando = false;
        setTimeout(() => {
          document.getElementById('productos-seccion')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      error: () => {
        this.productos = [];
        this.cargando = false;
      }
    });
  }
}
