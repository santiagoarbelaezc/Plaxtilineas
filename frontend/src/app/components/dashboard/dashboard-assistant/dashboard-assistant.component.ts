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

  // Variables para arrastrar (Drag and Drop)
  positionRight = 20;
  positionBottom = 20;
  isDragging = false;
  private dragMoved = false;
  private startX = 0;
  private startY = 0;
  private initialRight = 20;
  private initialBottom = 20;

  private onMouseMoveBind = this.onMouseMove.bind(this);
  private onMouseUpBind = this.onMouseUp.bind(this);
  private onTouchMoveBind = this.onTouchMove.bind(this);
  private onTouchEndBind = this.onTouchEnd.bind(this);
  
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

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return; // Solo clic izquierdo
    event.preventDefault(); // Evita arrastre nativo de imagen y selección
    this.startDrag(event.clientX, event.clientY);
    document.addEventListener('mousemove', this.onMouseMoveBind);
    document.addEventListener('mouseup', this.onMouseUpBind);
  }

  onTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.startDrag(touch.clientX, touch.clientY);
      document.addEventListener('touchmove', this.onTouchMoveBind, { passive: false });
      document.addEventListener('touchend', this.onTouchEndBind);
    }
  }

  private startDrag(clientX: number, clientY: number) {
    this.isDragging = true;
    this.dragMoved = false;
    this.startX = clientX;
    this.startY = clientY;
    this.initialRight = this.positionRight;
    this.initialBottom = this.positionBottom;
  }

  private onMouseMove(event: MouseEvent) {
    this.moveDrag(event.clientX, event.clientY);
  }

  private onTouchMove(event: TouchEvent) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.moveDrag(touch.clientX, touch.clientY);
      event.preventDefault(); // Previene scroll en móvil
    }
  }

  private moveDrag(clientX: number, clientY: number) {
    if (!this.isDragging) return;
    const deltaX = clientX - this.startX;
    const deltaY = clientY - this.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      this.dragMoved = true;
    }

    const newRight = this.initialRight - deltaX;
    const newBottom = this.initialBottom - deltaY;

    // Limitar al tamaño de la pantalla
    const maxRight = window.innerWidth - 100;
    const maxBottom = window.innerHeight - 100;

    this.positionRight = Math.max(0, Math.min(newRight, maxRight));
    this.positionBottom = Math.max(0, Math.min(newBottom, maxBottom));
  }

  private onMouseUp(event: MouseEvent) {
    this.endDrag();
    document.removeEventListener('mousemove', this.onMouseMoveBind);
    document.removeEventListener('mouseup', this.onMouseUpBind);
  }

  private onTouchEnd(event: TouchEvent) {
    this.endDrag();
    document.removeEventListener('touchmove', this.onTouchMoveBind);
    document.removeEventListener('touchend', this.onTouchEndBind);
  }

  private endDrag() {
    this.isDragging = false;
  }

  onFabClick(event: MouseEvent | TouchEvent) {
    if (this.dragMoved) {
      event.preventDefault();
      event.stopPropagation();
      this.dragMoved = false;
      return;
    }
    this.toggleChat();
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
