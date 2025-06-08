import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-social-buttons',
  templateUrl: './social-butoons.component.html',
  styleUrls: ['./social-buttons.component.css']
})
export class SocialButtonsComponent implements OnInit {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Detectar si es iPhone o Android para aplicar clase al <body>
    if (isPlatformBrowser(this.platformId)) {
      const ua = navigator.userAgent;
      if (/iPhone/.test(ua)) {
        document.body.classList.add('ios');
      } else if (/Android/.test(ua)) {
        document.body.classList.add('android');
      }
    }
  }

  ngOnInit(): void {
    // Mostrar y ocultar mensaje emergente cada 5 segundos
    if (isPlatformBrowser(this.platformId)) {
      const helpMessage = document.getElementById('helpMessage');
      if (helpMessage) {
        setInterval(() => {
          helpMessage.classList.add('show');
          setTimeout(() => {
            helpMessage.classList.remove('show');
          }, 3000); // visible por 3 segundos
        }, 5000); // cada 5 segundos
      }
    }
  }
}
