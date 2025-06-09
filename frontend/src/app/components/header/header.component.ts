import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule], // ✅ necesario para routerLink y el uso de Router
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  mostrarHeader: boolean = true;

  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      this.mostrarHeader = !['/login', '/admin'].includes(this.router.url);
    });
  }
}
