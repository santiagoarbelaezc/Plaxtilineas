import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faShoppingCart, faUsers, faEnvelope } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, FontAwesomeModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements AfterViewInit {
  mostrarHeader = true;

  @ViewChild('headerVideo') videoRef!: ElementRef<HTMLVideoElement>;

  constructor(private router: Router, private ngZone: NgZone, library: FaIconLibrary) {
    library.addIcons(faShoppingCart, faUsers, faEnvelope);
    this.router.events.subscribe(() => {
      this.mostrarHeader = !['/login', '/admin'].includes(this.router.url);
    });
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        const video = this.videoRef?.nativeElement;
        if (video) {
          video.muted = true;
          video.play().catch(err => console.log('[Header Video] Autoplay blocked or failed:', err));
          console.log('[Header Video] Video reproduciéndose por petición del usuario');
        }
      }, 1000); // Dar tiempo al preloader
    });
  }
}


