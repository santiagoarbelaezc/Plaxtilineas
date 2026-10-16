import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-mesh-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mesh-banner.component.html',
  styleUrls: ['./mesh-banner.component.css']
})
export class MeshBannerComponent {
  private chatService = inject(ChatService);

  abrirAsistente(): void {
    this.chatService.toggleChat();
  }
}
