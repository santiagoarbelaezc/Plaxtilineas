import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';

@Component({
  selector: 'app-cookies-page',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, Footer],
  templateUrl: './cookies.html',
  styleUrls: ['./cookies.css']
})
export class Cookies implements OnInit {
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

  openSettings(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    }
  }

  resetConsent(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reset-cookie-consent'));
    }
  }
}
