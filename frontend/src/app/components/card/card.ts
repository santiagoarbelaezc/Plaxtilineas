import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-card',
  imports: [RouterModule, CommonModule],
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

  constructor(private menuStateService: MenuStateService) {}
  
  // Manejo de error en la imagen
  handleImageError(event: any) {
    event.target.src = this.defaultImage;
    event.target.alt = 'Imagen no disponible';
  }

  // Método para verificar si tiene navegación
  tieneNavegacion(): boolean {
    return !!this.linkUrl && this.linkUrl.length > 0;
  }

  // Método para manejar la navegación y actualizar el servicio
  onNavigate(): void {
    if (this.tieneNavegacion() && this.queryParams.subcategoria_id) {
      this.menuStateService.saveLastSelectedSubcategory(this.queryParams.subcategoria_id);
      console.log(`📌 Navegando desde card a subcategoria ${this.queryParams.subcategoria_id}`);
    }
  }
}