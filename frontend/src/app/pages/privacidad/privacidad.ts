import { Component } from '@angular/core';
import { NavbarComponent } from "../../shared/layout/navbar/navbar.component";
import { Politica } from "../../shared/ui/politica/politica";

@Component({
  standalone: true,
  selector: 'app-privacidad',
  imports: [NavbarComponent, Politica],
  templateUrl: './privacidad.html',
  styleUrl: './privacidad.css'
})
export class Privacidad {

}
