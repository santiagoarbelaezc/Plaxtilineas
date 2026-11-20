import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-historia-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historia-banner.component.html',
  styleUrls: ['./historia-banner.component.css']
})
export class HistoriaBannerComponent {
  readonly logoUrl = 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png';
}
