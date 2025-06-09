import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // 👈 Router agregado
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faBoxes,
  faFolderOpen,
  faFolder,
  faSignOutAlt,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.css']
})
export class DashboardViewComponent {
  constructor(private router: Router, library: FaIconLibrary) {
    library.addIcons(faBoxes, faFolderOpen, faFolder, faSignOutAlt, faUserShield);
  }

  logout(): void {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  get estaEnInicio(): boolean {
    return this.router.url === '/admin';
  }
}
