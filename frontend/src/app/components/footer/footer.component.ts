import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true, // ✅ necesario
  imports: [RouterModule],       // ✅ importar RouterModule para que funcione routerLink
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'] // ✅ corregido: styleUrls, no styleUrl
})
export class Footer {}
