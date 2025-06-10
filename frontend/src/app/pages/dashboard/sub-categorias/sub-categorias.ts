import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubcategoriasComponent } from '../../../components/dashboard/sub-categorias/sub-categorias.component';

@Component({
  selector: 'app-sub-categorias',
  standalone: true,
  imports: [CommonModule, SubcategoriasComponent],
  templateUrl: './sub-categorias.html',
  styleUrls: ['./sub-categorias.css']
})
export class SubCategorias {}
