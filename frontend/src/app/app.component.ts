import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { Footer } from './components/footer/footer.component';
import { SocialButtonsComponent } from './components/social-buttons/social-buttons.component';
import { HeaderComponent } from './components/header/header.component';
import { Partners } from "./components/partners/partners.component";
import { SquareMap } from "./components/square-map/square-map.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    NavbarComponent,
    Footer,
    SocialButtonsComponent,
    HeaderComponent,
    Partners,
    SquareMap
],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Plaxtilineas';
}
