import { Component, inject, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PromoBannerService } from '../../../services/promo-banner.service';

@Component({
  selector: 'app-banner-registro',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './banner-registro.component.html',
  styleUrls: ['./banner-registro.component.css']
})
export class BannerRegistroComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private promoBannerService = inject(PromoBannerService);
  private elementRef = inject(ElementRef);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(([entry]) => {
        this.promoBannerService.setBannerVisible(entry.isIntersecting);
      }, {
        threshold: 0.1
      });
      this.observer.observe(this.elementRef.nativeElement);
    } else {
      this.promoBannerService.setBannerVisible(true);
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.promoBannerService.setBannerVisible(false);
  }

  goToRegister(): void {
    this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }
}
