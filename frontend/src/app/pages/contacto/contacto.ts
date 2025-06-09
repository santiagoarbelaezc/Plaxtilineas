import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from "../../components/social-buttons/social-buttons.component";
import { ContactoAsistente } from "../../components/contacto-asistente/contacto-asistente.component";
import { ImageMap } from "../../components/image-map/image-map.component";
import { Partners } from '../../components/partners/partners.component';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, NavbarComponent, Footer, SocialButtonsComponent, ContactoAsistente, ImageMap, Partners], // agrega otros si los usas
  templateUrl: './contacto.html',
  styleUrls: ['./contacto.css']
})
export class Contacto {}
