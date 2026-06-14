import { Component, Output, EventEmitter, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../enviroments/environment';

interface Message {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  productos?: any[];
  links?: { label: string; url: string; external?: boolean }[];
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
  sessionId: string = '';

  isTyping = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.sessionId = localStorage.getItem('mateo_session_id') || this.generateUUID();
    localStorage.setItem('mateo_session_id', this.sessionId);
    
    // Cargar historial del chat si existe
    this.cargarHistorial();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  generateUUID(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  cargarHistorial() {
    this.http.get<any>(`${environment.apiUrl}/chat/historial?session_id=${this.sessionId}`).subscribe({
      next: (res) => {
        const mensajes = res?.mensajes || res?.data?.mensajes;
        if (mensajes && Array.isArray(mensajes)) {
          this.messages = mensajes.map((m: any) => {
            const sender = (m.rol === 'user' || m.sender === 'user') ? 'user' : 'assistant';
            return {
              text: m.mensaje || m.text || '',
              sender: sender,
              timestamp: new Date(m.created_at || m.timestamp || new Date()),
              productos: m.productos || [],
              links: m.links || []
            };
          });
        }
      },
      error: (err) => console.error('Error al cargar historial', err)
    });
  }

  sendMessage() {
    const textToSend = this.newMessage.trim();
    if (!textToSend) return;

    // Agregar mensaje del usuario
    this.messages.push({
      text: textToSend,
      sender: 'user',
      timestamp: new Date()
    });

    this.newMessage = '';
    this.isTyping = true;
    this.scrollToBottom();

    // Enviar al backend
    this.http.post<any>(`${environment.apiUrl}/chat`, {
      mensaje: textToSend,
      session_id: this.sessionId
    }).subscribe({
      next: (res) => {
        this.isTyping = false;
        if (res) {
          const respuestaText = res.respuesta;
          const productos = res.productos || [];
          const redirect = res.redirect;
          
          const links: { label: string; url: string; external?: boolean }[] = [];
          
          // Agregar respuesta antes para asegurar que las tarjetas de productos se muestren
          this.messages.push({
            text: respuestaText,
            sender: 'assistant',
            timestamp: new Date(),
            productos: productos,
            links: links
          });

          // Si hay una redirección especificada por el backend (vía regex o palabra clave)
          if (redirect) {
            const isExternal = redirect.startsWith('http://') || redirect.startsWith('https://');
            links.push({
              label: isExternal ? 'Ir al enlace' : 'Ver Sección',
              url: redirect,
              external: isExternal
            });

            // Redirigir automáticamente después de 1.8 segundos para dejar que el usuario lea
            setTimeout(() => {
              this.closeChat.emit();
              if (isExternal) {
                window.open(redirect, '_blank');
              } else {
                this.router.navigateByUrl(redirect);
              }
            }, 1800);
          }
        }
      },
      error: (err) => {
        this.isTyping = false;
        console.error('Error en el chat', err);
        this.messages.push({
          text: 'Lo siento, he tenido problemas para responder. ¿Te gustaría que te comunique con un asesor?',
          sender: 'assistant',
          timestamp: new Date(),
          links: [{ label: 'Hablar con Asesor en WhatsApp', url: 'https://wa.me/573007365939', external: true }]
        });
      }
    });
  }

  navegarA(url: string, external?: boolean) {
    if (external) {
      window.open(url, '_blank');
    } else {
      this.closeChat.emit();
      this.router.navigateByUrl(url);
    }
  }

  onClose() {
    this.closeChat.emit();
  }

  reiniciarChat() {
    this.isTyping = true;
    this.http.delete<any>(`${environment.apiUrl}/chat/limpiar?session_id=${this.sessionId}`).subscribe({
      next: () => {
        this.isTyping = false;
        this.sessionId = this.generateUUID();
        localStorage.setItem('mateo_session_id', this.sessionId);
        this.messages = [];
      },
      error: (err) => {
        this.isTyping = false;
        console.error('Error al reiniciar chat:', err);
        // Reiniciar de todos modos en el cliente
        this.sessionId = this.generateUUID();
        localStorage.setItem('mateo_session_id', this.sessionId);
        this.messages = [];
      }
    });
  }
}
