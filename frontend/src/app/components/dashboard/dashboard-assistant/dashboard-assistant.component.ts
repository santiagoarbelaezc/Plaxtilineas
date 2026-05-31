import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../enviroments/environment';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

@Component({
  selector: 'app-dashboard-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-assistant.component.html',
  styleUrls: ['./dashboard-assistant.component.css']
})
export class DashboardAssistantComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  isOpen = false;
  isTyping = false;
  newMessage = '';
  private apiUrl = `${environment.apiUrl}/dashboard-assistant`;
  
  messages: Message[] = [
    {
      id: 1,
      text: '¡Hola! Soy Mateo, el asistente inteligente del sistema. ¿En qué te puedo ayudar hoy con el panel de administración?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ];

  constructor(private http: HttpClient, private router: Router) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  closeChat() {
    this.isOpen = false;
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now(),
      text: this.newMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    this.messages.push(userMessage);
    this.newMessage = '';
    this.isTyping = true;
    
    setTimeout(() => this.scrollToBottom(), 50);

    // Preparar payload de historial para backend
    const payload = {
      mensajes: this.messages.map(m => ({
        sender: m.sender,
        text: m.text
      }))
    };

    // Llamada real al backend
    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.isTyping = false;
        
        const assistantMsg: Message = {
          id: Date.now(),
          text: res.respuesta || 'Respuesta vacía',
          sender: 'assistant',
          timestamp: new Date()
        };
        this.messages.push(assistantMsg);

        // Procesar Redirección
        if (res.redirect) {
          setTimeout(() => {
            this.router.navigateByUrl(res.redirect);
          }, 1500); // 1.5s delay para que el usuario lea el mensaje
        }

        // Procesar Impresión
        if (res.print) {
          setTimeout(() => {
            window.print();
          }, 1000);
        }

        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        this.isTyping = false;
        const errorMsg: Message = {
          id: Date.now(),
          text: 'Lo siento, hubo un error de conexión con la IA.',
          sender: 'assistant',
          timestamp: new Date()
        };
        this.messages.push(errorMsg);
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }
}
