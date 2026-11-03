import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faShoppingCart, faUsers, faEnvelope, faRobot, faArrowRight, faShieldAlt, faTruck } from '@fortawesome/free-solid-svg-icons';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, FontAwesomeModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  mostrarHeader = true;
  public authService = inject(AuthService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  constructor(library: FaIconLibrary) {
    library.addIcons(faShoppingCart, faUsers, faEnvelope, faRobot, faArrowRight, faShieldAlt, faTruck);
    this.router.events.subscribe(() => {
      this.mostrarHeader = !['/login', '/admin'].includes(this.router.url);
    });
  }

  abrirAsistente(): void {
    this.chatService.toggleChat();
  }

  goToRegister(): void {
    this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }
}
