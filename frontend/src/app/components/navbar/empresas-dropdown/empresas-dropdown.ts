import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faCity } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-empresas-dropdown',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './empresas-dropdown.html',
  styleUrl: '../menu-dropdown/menu-dropdown.css'
})
export class EmpresasDropdown implements OnDestroy {
  menuVisible = false;
  private closeTimeout: any;

  constructor(library: FaIconLibrary) {
    library.addIcons(faCity);
  }

  ngOnDestroy(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
  }

  onMouseLeave(): void {
    this.closeTimeout = setTimeout(() => {
      this.menuVisible = false;
    }, 150);
  }

  onMouseEnter(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.menuVisible = true;
  }

  @HostListener('window:resize', [])
  onWindowResize(): void {
    if (window.innerWidth <= 768) {
      this.menuVisible = false;
    }
  }
}
