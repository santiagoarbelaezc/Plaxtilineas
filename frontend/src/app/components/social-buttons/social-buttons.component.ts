import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ContactoAsistente } from '../contacto-asistente/contacto-asistente.component';
import { ChatService } from '../../services/chat.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-social-buttons',
  standalone: true,
  imports: [CommonModule, ContactoAsistente],
  templateUrl: './social-butoons.component.html',
  styleUrls: ['./social-buttons.component.css']
})
export class SocialButtonsComponent implements OnInit, OnDestroy {
  
  private helpMessageTimeout: any;
  private chatSubscription?: Subscription;

  // Estado para mostrar/ocultar mensajes
  showHelpMessage = false;
  hoveredButton: string | null = null;
  isChatOpen = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    // Suscribirse al estado global del chat
    this.chatSubscription = this.chatService.isChatOpen$.subscribe(isOpen => {
      this.isChatOpen = isOpen;
    });

    if (isPlatformBrowser(this.platformId)) {
      this.helpMessageTimeout = setTimeout(() => {
        this.showHelpMessage = true;
        setTimeout(() => this.showHelpMessage = false, 4000);
      }, 3000);
    }
  }

  ngOnDestroy(): void {
    if (this.helpMessageTimeout) clearTimeout(this.helpMessageTimeout);
    if (this.chatSubscription) this.chatSubscription.unsubscribe();
  }

  toggleChat(): void {
    this.chatService.toggleChat();
  }

  onMouseEnter(buttonType: string): void {
    this.hoveredButton = buttonType;
    if (this.showHelpMessage) this.showHelpMessage = false;
  }

  onMouseLeave(buttonType: string): void {
    setTimeout(() => {
      if (this.hoveredButton === buttonType) this.hoveredButton = null;
    }, 300);
  }

  closeHelpMessage(): void {
    this.showHelpMessage = false;
  }
}