import { Component, Output, EventEmitter, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

@Component({
  selector: 'app-contacto-asistente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacto-asistente.component.html',
  styleUrl: './contacto-asistente.component.css'
})
export class ContactoAsistente implements OnInit, AfterViewChecked {
  @Output() closeChat = new EventEmitter<void>();
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  newMessage: string = '';
  messages: Message[] = [];

  isTyping = false;

  ngOnInit() {
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    // Agregar mensaje del usuario
    this.messages.push({
      text: this.newMessage,
      sender: 'user',
      timestamp: new Date()
    });

    const userMsg = this.newMessage.toLowerCase();
    this.newMessage = '';

    // Simular respuesta del asistente
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
      this.generateResponse(userMsg);
    }, 1500);
  }

  generateResponse(input: string) {
    let response = '';

    if (input.includes('hola') || input.includes('buenos dias')) {
      response = '¡Hola de nuevo! Cuéntame, ¿buscas algún producto específico o información sobre envíos?';
    } else if (input.includes('producto') || input.includes('catalogo')) {
      response = 'Puedes ver todos nuestros productos en la sección de Catálogo. ¿Te gustaría que te lleve allí?';
    } else if (input.includes('precio') || input.includes('cuanto vale')) {
      response = 'Los precios varían según la cantidad. Si deseas una cotización formal, puedo conectarte con un asesor comercial por WhatsApp.';
    } else if (input.includes('envio') || input.includes('domicilio')) {
      response = 'Hacemos envíos a todo el Quindío. ¡En Armenia son muy rápidos!';
    } else {
      response = 'Entiendo. Para darte una respuesta más precisa sobre "' + input + '", ¿te gustaría hablar con un asesor humano por WhatsApp?';
    }

    this.messages.push({
      text: response,
      sender: 'assistant',
      timestamp: new Date()
    });
  }

  onClose() {
    this.closeChat.emit();
  }
}
