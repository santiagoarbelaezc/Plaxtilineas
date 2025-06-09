import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importa todos los componentes que quieres mostrar en la vista de inicio
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { SquareMap } from '../../components/square-map/square-map.component';
import { Partners } from '../../components/partners/partners.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from '../../components/social-buttons/social-buttons.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    HeaderComponent,
    SquareMap,
    Partners,
    Footer,
    SocialButtonsComponent
  ],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class Inicio {}
