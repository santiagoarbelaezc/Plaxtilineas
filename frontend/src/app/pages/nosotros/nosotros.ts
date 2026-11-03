import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';
import { Values } from "../../features/home/values/values.component";
import { LongMap } from "../../features/dynamic/long-map/long-map.component";


@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [CommonModule, NavbarComponent, Footer, SocialButtonsComponent, Values, LongMap], // agrega otros si los usas
  templateUrl: './nosotros.html',
  styleUrl: './nosotros.css'
})
export class Nosotros {

}
