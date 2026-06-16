import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, NgZone, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faShoppingCart, faUsers, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { ChatService } from '../../services/chat.service';
import { FeatureNewProducts } from '../feature-new-products/feature-new-products';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, FontAwesomeModule, FeatureNewProducts],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  mostrarHeader = true;
  private chatService = inject(ChatService);

  @ViewChild('headerVideo') videoRef!: ElementRef<HTMLVideoElement>;

  // ── Carousel state ──────────────────────────────────────────────
  slides = [0, 1, 2]; // 3 slides
  currentSlide = 0;
  progressWidth = 0;

  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SLIDE_DURATION = 6000; // ms per slide
  private readonly PROGRESS_TICK = 60;    // ms per progress update

  constructor(private router: Router, private ngZone: NgZone, library: FaIconLibrary) {
    library.addIcons(faShoppingCart, faUsers, faEnvelope);
    this.router.events.subscribe(() => {
      this.mostrarHeader = !['/login', '/admin'].includes(this.router.url);
    });
  }

  abrirAsistenteMobile(): void {
    this.chatService.toggleChat();
  }

  abrirAsistente(): void {
    this.chatService.toggleChat();
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      // Start video
      setTimeout(() => {
        const video = this.videoRef?.nativeElement;
        if (video) {
          video.muted = true;
          video.play().catch(err => console.log('[Header Video] Autoplay blocked or failed:', err));
        }
      }, 1000);

      // Start carousel autoplay
      this.startAutoplay();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  private startAutoplay(): void {
    this.progressWidth = 0;
    const tickStep = (this.PROGRESS_TICK / this.SLIDE_DURATION) * 100;

    this.progressInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.progressWidth += tickStep;
        if (this.progressWidth >= 100) {
          this.progressWidth = 0;
          this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        }
      });
    }, this.PROGRESS_TICK);
  }

  private stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private resetAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.resetAutoplay();
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.resetAutoplay();
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.resetAutoplay();
  }
}
