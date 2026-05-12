import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-card-promos',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './card-promos.html',
  styleUrls: ['./card-promos.css']
})
export class CardPromos {
  @Input() titulo: string = '';
  @Input() descripcion: string = '';
  @Input() imagen: string = '';
  @Input() logoUrl: string = '';
  @Input() linkUrl: string[] = [];
  @Input() queryParams: any = {};

  constructor(private menuStateService: MenuStateService, library: FaIconLibrary) {
    library.addIcons(faChevronRight);
  }

  shouldBeTransparent(): boolean {
    // Verifica si descripción Y logo están vacíos (imagen puede tener valor)
    const isDescripcionEmpty = !this.descripcion || this.descripcion.trim() === '';
    const isLogoUrlEmpty = !this.logoUrl || this.logoUrl.trim() === '';
    
    return isDescripcionEmpty && isLogoUrlEmpty;
  }

  // Método para verificar si tiene navegación
  tieneNavegacion(): boolean {
    return !!this.linkUrl && this.linkUrl.length > 0;
  }

  // Método para manejar la navegación y actualizar el servicio
  onNavigate(): void {
    if (this.tieneNavegacion()) {
      this.menuStateService.clearLastSelectedSubcategory();
      console.log('🔍 Navegando desde card-promos, último subcategoria limpiada');
    }
  }
}