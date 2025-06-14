import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoriaMenuService } from '../../services/categoria-menu.service';
import { CategoriaConSubcategorias } from '../../models/categoriaMenu.model';

@Component({
  selector: 'app-menu-categorias-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-categorias.component.html',
  styleUrls: ['./menu-categorias.component.css']
})
export class MenuCategoriasComponent implements OnInit {
  categorias: (CategoriaConSubcategorias & { expanded?: boolean })[] = [];

  constructor(
    private categoriaService: CategoriaMenuService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // primero capturamos el queryParam
    let categoriaIdDesdeURL: number | null = null;
    this.route.queryParams.subscribe(params => {
      const catId = parseInt(params['categoria_id']);
      if (!isNaN(catId)) {
        categoriaIdDesdeURL = catId;
      }
    });

    // luego cargamos las categorías
    this.categoriaService.obtenerCategorias().subscribe(data => {
      this.categorias = data.map(c => ({ ...c, expanded: false }));

      // si hay un ID desde URL, lo expandimos después de tener los datos
      if (categoriaIdDesdeURL) {
        const encontrada = this.categorias.find(c => c.id === categoriaIdDesdeURL);
        if (encontrada) {
          encontrada.expanded = true;

          // scroll opcional
          setTimeout(() => {
            const el = document.getElementById(`cat-${encontrada.id}`);
            el?.scrollIntoView({ behavior: 'smooth' });
          }, 200);
        }
      }
    });
  }

  toggle(cat: CategoriaConSubcategorias & { expanded?: boolean }) {
    cat.expanded = !cat.expanded;
  }

  seleccionarSubcategoria(subcatId: number) {
    this.router.navigate(['/productos'], {
      queryParams: { subcategoria_id: subcatId }
    });
  }
}
