import { Component } from '@angular/core';
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { Politica } from "../../components/politica/politica";

@Component({
  selector: 'app-privacidad',
  imports: [NavbarComponent, Politica],
  templateUrl: './privacidad.html',
  styleUrl: './privacidad.css'
})
export class Privacidad {

}
