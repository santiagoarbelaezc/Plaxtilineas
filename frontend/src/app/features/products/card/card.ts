import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { MenuStateService } from '../../../services/menu-state.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [RouterModule, CommonModule, FontAwesomeModule],
  templateUrl: './card.html',
  styleUrl: './card.css'
})
export class Card {
  @Input() precio: string = '';
  @Input() nombreProducto: string = '';
  @Input() imagenProducto: string = '';
  @Input() linkUrl: string[] = [];
  @Input() queryParams: any = {};
  
  // URL del logo de la empresa
  logoUrl: string = 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767224962/logo-peque%C3%B1o_mrokec.png';
  
  // Imagen de respaldo en caso de error
  defaultImage: string = 'https://via.placeholder.com/250x200/6c757d/ffffff?text=Producto';

  private menuStateService = inject(MenuStateService);
  private library = inject(FaIconLibrary);

  constructor() {
    this.library.addIcons(faArrowRight);
  }
  
  // Manejo de error en la imagen
  handleImageError(event: any) {
    event.target.src = this.defaultImage;
    event.target.alt = 'Imagen no disponible';
  }

  // Método para verificar si tiene navegación
  tieneNavegacion(): boolean {
    return !!this.linkUrl && this.linkUrl.length > 0;
  }

  onNavigate() {
    this.onCardClick();
  }

  // NUEVO: Método para manejar el clic en la tarjeta
  onCardClick() {
    if (this.queryParams && this.queryParams.subcategoria_id) {
      console.log('📌 Guardando subcategoría seleccionada desde card:', this.queryParams.subcategoria_id);
      this.menuStateService.saveLastSelectedSubcategory(this.queryParams.subcategoria_id);
    }
  }
}