import { Component, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FeatureBanner } from '../feature-banner/feature-banner';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements AfterViewInit {
  mostrarHeader = true;

  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      this.mostrarHeader = !['/login', '/admin'].includes(this.router.url);
    });
  }

  ngAfterViewInit() {
    const video = document.querySelector('video.video-background') as HTMLVideoElement;
    if (video) {
      video.muted = true;
      video.play().catch(err => console.warn('🎥 Autoplay bloqueado:', err));
    }
  }
}
