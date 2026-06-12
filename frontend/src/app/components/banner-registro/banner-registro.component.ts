import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-banner-registro',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './banner-registro.component.html',
  styleUrls: ['./banner-registro.component.css']
})
export class BannerRegistroComponent {
  private router = inject(Router);

  goToRegister(): void {
    this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }
}
