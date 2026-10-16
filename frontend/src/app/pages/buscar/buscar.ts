import { Component } from '@angular/core';
import { SearchComponent } from "../../features/search/search-component/search-component";
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';

@Component({
  standalone: true,
  selector: 'app-buscar',
  imports: [SearchComponent, NavbarComponent, Footer, SocialButtonsComponent],
  templateUrl: './buscar.html',
  styleUrl: './buscar.css'
})
export class Buscar {

}
