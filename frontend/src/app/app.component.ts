import { Component, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AosService } from './services/aos.service';
import { ScrollService } from './services/scroll.service';
import { SeoService } from './services/seo.service';
import { NavbarComponent } from "./components/navbar/navbar.component";
import { CommonModule } from '@angular/common';
import { CartDrawerComponent } from './cart/cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // Necesario para directivas como *ngIf, *ngFor
    RouterModule,
    CartDrawerComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Plaxtilineas';

  constructor(
    private aosService: AosService,
    private scrollService: ScrollService,
    private router: Router,
    private seoService: SeoService
  ) {}

  ngOnInit() {
    console.log('🚀 AppComponent inicializado');
    
    // Inicializar SEO por defecto
    this.seoService.setDefaultSeo();
    
    // Inicializar AOS
    this.aosService.init();
    console.log('✅ AOS inicializado');
    
    // Configurar scroll al top
    this.setupRouteChangeScroll();
  }

  private setupRouteChangeScroll(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      console.log(`📍 Navegación completada: ${event.url}`);
      
      // Re-inicializar AOS después de cada navegación
      setTimeout(() => {
        this.aosService.refresh();
        console.log('🔄 AOS refrescado');
      }, 100);
    });
  }
}