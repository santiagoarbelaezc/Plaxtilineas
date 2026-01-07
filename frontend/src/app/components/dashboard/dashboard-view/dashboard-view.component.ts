import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faBoxes,
  faFolderOpen,
  faFolder,
  faSignOutAlt,
  faUserShield,
  faHome,
  faBolt,
  faWarehouse,      // Icono para Inventario
  faClipboardList   // Icono para PQR
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.css']
})
export class DashboardViewComponent {
  // Definir las propiedades públicas para los iconos
  faBoxes = faBoxes;
  faFolderOpen = faFolderOpen;
  faFolder = faFolder;
  faSignOutAlt = faSignOutAlt;
  faUserShield = faUserShield;
  faHome = faHome;
  faBolt = faBolt;
  faWarehouse = faWarehouse;      // Icono para Inventario
  faClipboardList = faClipboardList; // Icono para PQR

  constructor(private router: Router, library: FaIconLibrary) {
    library.addIcons(
      faBoxes, 
      faFolderOpen, 
      faFolder, 
      faSignOutAlt, 
      faUserShield, 
      faHome, 
      faBolt,
      faWarehouse,      // Añadido al library
      faClipboardList   // Añadido al library
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  get estaEnInicio(): boolean {
    return this.router.url === '/admin';
  }
}