import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-social-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-butoons.component.html',
  styleUrls: ['./social-buttons.component.css']
})
export class SocialButtonsComponent implements OnInit {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
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
    if (isPlatformBrowser(this.platformId)) {
      const helpMessage = document.getElementById('helpMessage');
      if (helpMessage) {
        setInterval(() => {
          helpMessage.classList.add('show');
          setTimeout(() => {
            helpMessage.classList.remove('show');
          }, 3000);
        }, 5000);
      }
    }
  }
}
