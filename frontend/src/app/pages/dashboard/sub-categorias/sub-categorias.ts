import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubCategoriasComponent } from '../../../components/dashboard/sub-categorias/sub-categorias.component';

@Component({
  selector: 'app-sub-categorias',
  standalone: true,
  imports: [CommonModule, SubCategoriasComponent],
  templateUrl: './sub-categorias.html',
  styleUrls: ['./sub-categorias.css']
})
export class SubCategorias {}
