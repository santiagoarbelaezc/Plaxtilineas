import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class Footer {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  abrirConfiguracionCookies(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    }
  }
}
