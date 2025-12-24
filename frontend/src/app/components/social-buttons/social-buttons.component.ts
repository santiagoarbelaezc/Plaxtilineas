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
  
  private helpMessageInterval: any;
  private helpMessageTimeout: any;
  private mouseLeaveTimeout: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const ua = navigator.userAgent;
      if (/iPhone/.test(ua)) {
        document.body.classList.add('ios');
      } else if (/Android/.test(ua)) {
        document.body.classList.add('android');
      }
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Mostrar mensaje inicial después de 2 segundos (antes era 3)
      setTimeout(() => {
        this.showHelpMessage();
        
        // Iniciar ciclo repetitivo
        this.startHelpMessageCycle();
      }, 2000);

      // Configurar listeners para hover en WhatsApp
      this.setupWhatsAppHover();
    }
  }

  ngOnDestroy(): void {
    // Limpiar todos los timers al destruir el componente
    if (this.helpMessageInterval) {
      clearInterval(this.helpMessageInterval);
    }
    if (this.helpMessageTimeout) {
      clearTimeout(this.helpMessageTimeout);
    }
    if (this.mouseLeaveTimeout) {
      clearTimeout(this.mouseLeaveTimeout);
    }
  }

  private showHelpMessage(): void {
    const helpMessage = document.getElementById('helpMessage');
    if (helpMessage) {
      helpMessage.classList.add('show');
      
      // Ocultar después de 4 segundos (antes era 5)
      this.helpMessageTimeout = setTimeout(() => {
        helpMessage.classList.remove('show');
      }, 4000);
    }
  }

  private hideHelpMessage(): void {
    const helpMessage = document.getElementById('helpMessage');
    if (helpMessage) {
      helpMessage.classList.remove('show');
    }
  }

  private startHelpMessageCycle(): void {
    // Mostrar el mensaje cada 12 segundos (ajusta este valor según lo frecuente que quieras)
    this.helpMessageInterval = setInterval(() => {
      this.showHelpMessage();
    }, 12000); // Cambia este valor: 8000 = 8 seg, 10000 = 10 seg, 15000 = 15 seg
  }

  private setupWhatsAppHover(): void {
    const whatsappButton = document.querySelector('.whatsapp-button');
    const helpMessage = document.getElementById('helpMessage');

    if (whatsappButton && helpMessage) {
      // Mostrar mensaje al pasar el mouse
      whatsappButton.addEventListener('mouseenter', () => {
        // Limpiar timeout previo si existe
        if (this.mouseLeaveTimeout) {
          clearTimeout(this.mouseLeaveTimeout);
        }
        // Pausar el ciclo automático temporalmente
        if (this.helpMessageInterval) {
          clearInterval(this.helpMessageInterval);
        }
        helpMessage.classList.add('show');
      });

      // Ocultar mensaje al salir del botón
      whatsappButton.addEventListener('mouseleave', () => {
        this.mouseLeaveTimeout = setTimeout(() => {
          helpMessage.classList.remove('show');
          // Reiniciar el ciclo automático después de la interacción
          this.startHelpMessageCycle();
        }, 2000);
      });

      // También mostrar al pasar sobre el mensaje mismo
      helpMessage.addEventListener('mouseenter', () => {
        if (this.mouseLeaveTimeout) {
          clearTimeout(this.mouseLeaveTimeout);
        }
        helpMessage.classList.add('show');
      });

      helpMessage.addEventListener('mouseleave', () => {
        this.mouseLeaveTimeout = setTimeout(() => {
          helpMessage.classList.remove('show');
        }, 1000);
      });
    }
  }

  // Métodos públicos que pueden ser llamados desde el template si es necesario
  onWhatsAppMouseEnter(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.mouseLeaveTimeout) {
        clearTimeout(this.mouseLeaveTimeout);
      }
      // Pausar ciclo automático
      if (this.helpMessageInterval) {
        clearInterval(this.helpMessageInterval);
      }
      const helpMessage = document.getElementById('helpMessage');
      if (helpMessage) {
        helpMessage.classList.add('show');
      }
    }
  }

  onWhatsAppMouseLeave(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.mouseLeaveTimeout = setTimeout(() => {
        const helpMessage = document.getElementById('helpMessage');
        if (helpMessage) {
          helpMessage.classList.remove('show');
        }
        // Reiniciar ciclo automático
        this.startHelpMessageCycle();
      }, 2000);
    }
  }
}