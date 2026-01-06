import { Component } from '@angular/core';
import { PqrClienteComponent } from "../../components/pqr-cliente/pqr-cliente";
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';

@Component({
  selector: 'app-pqr',
  imports: [PqrClienteComponent, NavbarComponent, Footer],
  templateUrl: './pqr.html',
  styleUrl: './pqr.css'
})
export class Pqr {

}
