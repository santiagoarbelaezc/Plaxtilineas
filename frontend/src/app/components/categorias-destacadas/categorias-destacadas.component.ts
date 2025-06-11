import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoriaIndex } from '../../models/categoriaIndex.model';
import { CategoriasService } from '../../services/categorias.service';

@Component({
  selector: 'app-categorias-component',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categorias-destacadas.component.html',
  styleUrls: ['./categorias-destacadas.component.css']
})
export class CategoriasIndexComponent implements OnInit {
  categorias: CategoriaIndex[] = [];

  constructor(private categoriasService: CategoriasService) {}

  ngOnInit(): void {
      this.categoriasService.getCategorias().subscribe({
      next: data => this.categorias = data,
      error: err => console.error('❌ Error al cargar categorías destacadas:', err)
    });
  }
}
