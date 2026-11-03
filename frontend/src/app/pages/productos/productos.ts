import { Component, ElementRef, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from "../../shared/layout/social-buttons/social-buttons.component";
import { MenuCategoriasComponent } from "../../shared/ui/menu-categorias/menu-categorias.component";
import {ProductListComponent} from "../../features/products/product-list/product-list.component"
import { HeaderComponent } from "../../features/home/hero/header.component";
import {ModalProductoComponent} from "../../features/products/modal-producto/modal-producto.component";
import { FeatureNewProducts } from '../../features/home/feature-new-products/feature-new-products';
import { FeatureRandomProducts } from '../../features/home/feature-random-products/feature-random-products';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, NavbarComponent, Footer, SocialButtonsComponent, MenuCategoriasComponent,
    ProductListComponent, ModalProductoComponent, FeatureRandomProducts],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos implements AfterViewInit {  
  @ViewChild('menuCategorias', { read: ElementRef }) menuCategorias!: ElementRef;
  menuVisible = false;

  ngAfterViewInit() {
    // Verificar que el elemento se está capturando correctamente
    console.log('Elemento menuCategorias:', this.menuCategorias?.nativeElement);
  }

  toggleMenu() {
    console.log('toggleMenu llamado, menuVisible actual:', this.menuVisible);
    
    if (this.menuCategorias?.nativeElement) {
      this.menuVisible = !this.menuVisible;
      console.log('Nuevo menuVisible:', this.menuVisible);
      
      if (this.menuVisible) {
        this.menuCategorias.nativeElement.classList.add('menu-visible');
        console.log('Clase menu-visible añadida');
      } else {
        this.menuCategorias.nativeElement.classList.remove('menu-visible');
        console.log('Clase menu-visible removida');
      }
    } else {
      console.error('Elemento menuCategorias no encontrado');
    }
  }

  closeMenu() {
    console.log('closeMenu llamado');
    if (this.menuVisible && this.menuCategorias?.nativeElement) {
      this.menuCategorias.nativeElement.classList.remove('menu-visible');
      this.menuVisible = false;
      console.log('Menú cerrado');
    }
  }

  // Cerrar menú al presionar Escape
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: Event) {
    this.closeMenu();
  }

  // Cerrar menú al cambiar tamaño de pantalla (si se hace más grande)
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (window.innerWidth >= 768 && this.menuVisible) {
      this.closeMenu();
    }
  }
}