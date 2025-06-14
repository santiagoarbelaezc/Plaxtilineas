import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from "../../components/social-buttons/social-buttons.component";
import { MenuCategoriasComponent } from "../../components/menu-categorias/menu-categorias.component";
import {ProductListComponent} from "../../components/product-list/product-list.component"
import { HeaderComponent } from "../../components/header/header.component";
import {ModalProductoComponent} from "../../components/modal-producto/modal-producto.component";

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, NavbarComponent, Footer, SocialButtonsComponent, MenuCategoriasComponent
    , HeaderComponent, ProductListComponent, ModalProductoComponent],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']  // ← corregido aquí
})
export class Productos {  

}
