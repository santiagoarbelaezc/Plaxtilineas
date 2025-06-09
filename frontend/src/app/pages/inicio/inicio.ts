import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importa todos los componentes que quieres mostrar en la vista de inicio
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { Partners } from '../../components/partners/partners.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from '../../components/social-buttons/social-buttons.component';
import { LongMap } from "../../components/long-map/long-map.component";

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    HeaderComponent,
    Partners,
    Footer,
    SocialButtonsComponent,
    LongMap
],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class Inicio {}
