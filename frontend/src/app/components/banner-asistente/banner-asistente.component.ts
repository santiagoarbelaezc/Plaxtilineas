import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-banner-asistente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-asistente.component.html',
  styleUrl: './banner-asistente.component.css'
})
export class BannerAsistenteComponent {
  constructor(private chatService: ChatService) {}

  abrirChat() {
    this.chatService.openChat();
  }
}
