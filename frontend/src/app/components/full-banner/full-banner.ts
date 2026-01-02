import { Component, Input } from '@angular/core';

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
}