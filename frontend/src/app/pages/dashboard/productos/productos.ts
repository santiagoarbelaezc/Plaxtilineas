import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductosComponent } from '../../../components/dashboard/productos/productos.component';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductosComponent],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos {}
