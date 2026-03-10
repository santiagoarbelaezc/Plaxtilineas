import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  mostrarHeader = true;

  @ViewChild('headerVideo', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private observer: IntersectionObserver | null = null;

  constructor(private router: Router, private ngZone: NgZone) {
    this.router.events.subscribe(() => {
      this.mostrarHeader = !['/login', '/admin'].includes(this.router.url);
    });
  }

  ngAfterViewInit() {
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    // Forzar muted en todos los niveles (Edge lo requiere)
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const play = () => {
      video.muted = true;
      video.volume = 0;
      video.play().catch(err => console.warn('[Header Video] Autoplay bloqueado:', err));
    };

    video.addEventListener('canplay', play);
    video.addEventListener('loadedmetadata', play);

    // IntersectionObserver: pausar cuando no es visible
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          play();
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.1 });
    this.observer.observe(video);

    // Intento inicial
    play();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}


