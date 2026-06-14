import { Component } from '@angular/core';
import { SearchComponent } from "../../components/search-component/search-component";
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';
import { SocialButtonsComponent } from '../../components/social-buttons/social-buttons.component';

@Component({
  selector: 'app-buscar',
  imports: [SearchComponent, NavbarComponent, Footer, SocialButtonsComponent],
  templateUrl: './buscar.html',
  styleUrl: './buscar.css'
})
export class Buscar {

}
