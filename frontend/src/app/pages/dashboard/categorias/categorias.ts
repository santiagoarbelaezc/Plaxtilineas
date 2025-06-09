import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriasComponent } from '../../../components/dashboard/categorias/categorias.component';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, CategoriasComponent],
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.css']
})
export class Categorias {
  
}
