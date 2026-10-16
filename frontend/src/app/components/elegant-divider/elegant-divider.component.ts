import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-elegant-divider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './elegant-divider.component.html',
  styleUrls: ['./elegant-divider.component.css']
})
export class ElegantDividerComponent {
  /**
   * Color de fondo del contenedor del separador (por defecto blanco para coincidir con componentes blancos)
   */
  @Input() background: 'white' | 'light' | 'transparent' = 'white';

  /**
   * Ancho máximo del contenedor de la línea
   */
  @Input() maxWidth: string = '1550px';

  /**
   * Espaciado vertical opcional
   */
  @Input() spacing: 'none' | 'sm' | 'md' | 'lg' = 'none';

  /**
   * Si incluye un sutil detalle/acento central
   */
  @Input() withAccent: boolean = false;
}
