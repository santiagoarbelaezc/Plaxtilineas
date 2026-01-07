import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  navigateToLink(): void {
    if (this.linkUrl) {
      this.router.navigateByUrl(this.linkUrl);
    }
  }
}