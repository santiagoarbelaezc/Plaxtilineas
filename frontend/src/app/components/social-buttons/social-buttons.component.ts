import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-social-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-butoons.component.html',
  styleUrls: ['./social-buttons.component.css']
})
export class SocialButtonsComponent implements OnInit, OnDestroy {
  
  private helpMessageTimeout: any;
  private mouseLeaveTimeout: any;
  private hoverTimeout: any;

  // Estado para mostrar/ocultar mensajes
  showHelpMessage = false;
  hoveredButton: string | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Mostrar mensaje inicial después de 3 segundos
      this.helpMessageTimeout = setTimeout(() => {
        this.showHelpMessage = true;
        
        // Ocultar después de 4 segundos
        setTimeout(() => {
          this.showHelpMessage = false;
        }, 4000);
      }, 3000);
    }
  }

  ngOnDestroy(): void {
    // Limpiar todos los timers al destruir el componente
    if (this.helpMessageTimeout) {
      clearTimeout(this.helpMessageTimeout);
    }
    if (this.mouseLeaveTimeout) {
      clearTimeout(this.mouseLeaveTimeout);
    }
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }

  // Métodos para manejar hover
  onMouseEnter(buttonType: string): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    this.hoveredButton = buttonType;
    
    // Ocultar mensaje general si está visible
    if (this.showHelpMessage) {
      this.showHelpMessage = false;
    }
  }

  onMouseLeave(buttonType: string): void {
    this.hoverTimeout = setTimeout(() => {
      if (this.hoveredButton === buttonType) {
        this.hoveredButton = null;
      }
    }, 300);
  }

  // Método para cerrar el mensaje de ayuda
  closeHelpMessage(): void {
    this.showHelpMessage = false;
  }
}