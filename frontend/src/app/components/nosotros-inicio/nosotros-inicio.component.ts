import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faBox, faBoxOpen, faTruck, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-nosotros-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, FontAwesomeModule],
  templateUrl: './nosotros-inicio.component.html',
  styleUrls: ['./nosotros-inicio.component.css']
})
export class NosotrosInicioComponent {
  private menuStateService = inject(MenuStateService);

  constructor(library: FaIconLibrary) {
    library.addIcons(faBox, faBoxOpen, faTruck, faLayerGroup);
  }

  limpiarFiltros(): void {
    this.menuStateService.clearLastSelectedSubcategory();
  }
}
