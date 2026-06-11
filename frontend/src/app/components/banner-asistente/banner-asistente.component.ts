import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faComments, faBoxOpen, faTruck } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-banner-asistente',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './banner-asistente.component.html',
  styleUrl: './banner-asistente.component.css'
})
export class BannerAsistenteComponent {
  faComments = faComments;
  faBoxOpen = faBoxOpen;
  faTruck = faTruck;

  constructor(private chatService: ChatService) {}

  abrirChat() {
    this.chatService.openChat();
  }
}
