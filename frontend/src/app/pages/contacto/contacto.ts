import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';
import { ImageMap } from "../../features/dynamic/image-map/image-map.component";
import { Partners } from '../../shared/layout/partners/partners.component';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, NavbarComponent, Footer, SocialButtonsComponent, ImageMap, Partners], // agrega otros si los usas
  templateUrl: './contacto.html',
  styleUrls: ['./contacto.css']
})
export class Contacto {}
