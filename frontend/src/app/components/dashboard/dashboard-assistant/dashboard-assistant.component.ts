import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  
  messages: Message[] = [
    {
      id: 1,
      text: '¡Hola! Soy Mateo, el asistente del sistema. ¿En qué te puedo ayudar hoy con el panel de administración?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ];

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
    const query = this.newMessage;
    this.newMessage = '';
    this.isTyping = true;
    
    setTimeout(() => this.scrollToBottom(), 50);

    // Simular respuesta del asistente
    setTimeout(() => {
      this.isTyping = false;
      this.simulateResponse(query);
    }, 1500 + Math.random() * 1000); // 1.5 - 2.5s
  }

  private simulateResponse(query: string) {
    const textLower = query.toLowerCase();
    let responseText = 'He registrado tu consulta. Por el momento soy un asistente en pruebas, pronto tendré acceso a todos los datos del sistema.';

    if (textLower.includes('inventario') || textLower.includes('stock') || textLower.includes('productos')) {
      responseText = 'Para gestionar los productos y el inventario, dirígete a la pestaña "Catálogo" > "Productos". Allí podrás actualizar el stock de las variantes.';
    } else if (textLower.includes('pqr') || textLower.includes('queja') || textLower.includes('reclamo')) {
      responseText = 'Puedes gestionar todos los tickets de PQR en la sección correspondiente. El sistema ahora soporta estados (Pendiente, En Proceso, Resuelto).';
    } else if (textLower.includes('hola') || textLower.includes('buenos dias') || textLower.includes('buenas')) {
      responseText = '¡Hola! ¿Cómo está yendo la gestión de la tienda hoy?';
    } else if (textLower.includes('gracias')) {
      responseText = '¡De nada! Aquí estoy para lo que necesites.';
    }

    const assistantMsg: Message = {
      id: Date.now(),
      text: responseText,
      sender: 'assistant',
      timestamp: new Date()
    };

    this.messages.push(assistantMsg);
    setTimeout(() => this.scrollToBottom(), 50);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }
}
