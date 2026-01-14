import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-full-banner',
  imports: [],
  templateUrl: './full-banner.html',
  styleUrl: './full-banner.css'
})
export class FullBanner {
  @Input() imageUrl: string = '';
  @Input() description: string = '';
  
  // Posición vertical
  @Input() vPosition: 'top' | 'middle' | 'bottom' = 'bottom';
  
  // Posición horizontal
  @Input() hPosition: 'left' | 'center' | 'right' = 'right';
  
  // URL a la que redirigir cuando se haga clic
  @Input() linkUrl: string = '';
  
  // ID de la subcategoría para guardar en el estado
  @Input() subcategoriaId: number = 0;

  constructor(private router: Router, private menuStateService: MenuStateService) {}

  navigateToLink(): void {
    if (this.linkUrl) {
      if (this.subcategoriaId) {
        this.menuStateService.saveLastSelectedSubcategory(this.subcategoriaId);
        console.log(`📌 Navegando desde full-banner a subcategoria ${this.subcategoriaId}`);
      }
      this.router.navigateByUrl(this.linkUrl);
    }
  }
}