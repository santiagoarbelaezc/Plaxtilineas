import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from "../../components/social-buttons/social-buttons.component";

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, NavbarComponent, Footer, SocialButtonsComponent],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']  // ← corregido aquí
})
export class Productos {  

}
