import { Component } from '@angular/core';
import { PqrClienteComponent } from "../../features/contact/pqr-cliente/pqr-cliente";
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';

@Component({
  standalone: true,
  selector: 'app-pqr',
  imports: [PqrClienteComponent, NavbarComponent, Footer],
  templateUrl: './pqr.html',
  styleUrl: './pqr.css'
})
export class Pqr {

}
