import { Component, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../enviroments/environment';
import { ChatModerationService } from '../../services/chat-moderation.service';

interface Message {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  productos?: any[];
  links?: { label: string; url: string; external?: boolean }[];
  type?: 'normal' | 'warning' | 'error';
}

interface ModerationState {
  infractions: number;
  isBlocked: boolean;
  blockCountdown: number;
}

@Component({
  selector: 'app-contacto-asistente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacto-asistente.component.html',
  styleUrl: './contacto-asistente.component.css'
})
export class ContactoAsistente implements OnInit, AfterViewChecked, OnDestroy {
  @Output() closeChat = new EventEmitter<void>();
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  newMessage: string = '';
  messages: Message[] = [];
  sessionId: string = '';
  isTyping = false;
  maxChars = 500;

  // Estado de moderación
  moderation: ModerationState = {
    infractions: 0,
    isBlocked: false,
    blockCountdown: 0
  };
  private blockInterval: any = null;

  // Quick replies para el chat público
  quickReplies: string[] = [
    '🛒 Ver productos',
    '📦 Hacer pedido',
    '📍 ¿Dónde están?',
    '💬 Hablar con asesor',
    '🔖 Promociones',
  ];
  showQuickReplies = true;

  private previousMessagesLength = 0;
  private previousIsTyping = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private moderationService: ChatModerationService
  ) {}

  viewportHeight: string = '100dvh';
  viewportTop: string = '0px';

  private handleViewportChange = () => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      this.viewportHeight = window.visualViewport.height + 'px';
      this.viewportTop = window.visualViewport.offsetTop + 'px';
    }
  };

  ngOnInit() {
    this.sessionId = localStorage.getItem('mateo_session_id') || this.generateUUID();
    localStorage.setItem('mateo_session_id', this.sessionId);
    this.cargarHistorial();

    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('chat-modal-open');
      document.body.classList.add('chat-modal-open');
    }

    if (typeof window !== 'undefined' && window.visualViewport) {
      this.handleViewportChange();
      window.visualViewport.addEventListener('resize', this.handleViewportChange);
      window.visualViewport.addEventListener('scroll', this.handleViewportChange);
    }
  }

  ngAfterViewChecked() {
    if (this.messages.length !== this.previousMessagesLength || this.isTyping !== this.previousIsTyping) {
      this.scrollToBottom();
      this.previousMessagesLength = this.messages.length;
      this.previousIsTyping = this.isTyping;
    }
  }

  ngOnDestroy() {
    if (this.blockInterval) clearInterval(this.blockInterval);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('chat-modal-open');
      document.body.classList.remove('chat-modal-open');
    }
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.handleViewportChange);
      window.visualViewport.removeEventListener('scroll', this.handleViewportChange);
    }
  }

  generateUUID(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
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
              links: m.links || [],
              type: 'normal'
            };
          });
          if (this.messages.length > 0) {
            this.showQuickReplies = false;
          }
        }
      },
      error: (err) => console.error('Error al cargar historial', err)
    });
  }

  get charCount(): number {
    return this.newMessage.length;
  }

  get charCountClass(): string {
    if (this.charCount > 450) return 'char-danger';
    if (this.charCount > 350) return 'char-warn';
    return '';
  }

  /**
   * Maneja un mensaje inapropiado usando el servicio de moderación.
   */
  private handleInappropriateMessage(warningMsgOverride?: string): void {
    this.moderation.infractions++;
    this.isTyping = true;

    setTimeout(() => {
      this.isTyping = false;
      const warningInfo = this.moderationService.getWarningForInfraction(this.moderation.infractions);
      const textToDisplay = warningMsgOverride || warningInfo.text;

      this.messages.push({
        text: textToDisplay,
        sender: 'assistant',
        timestamp: new Date(),
        type: warningInfo.type
      });

      if (warningInfo.blockSeconds > 0) {
        this.activateChatBlock(warningInfo.blockSeconds);
      }
    }, 800);
  }

  /**
   * Activa el bloqueo temporal del chat.
   */
  private activateChatBlock(seconds: number): void {
    this.moderation.isBlocked = true;
    this.moderation.blockCountdown = seconds;

    if (this.blockInterval) clearInterval(this.blockInterval);

    this.blockInterval = setInterval(() => {
      this.moderation.blockCountdown--;
      if (this.moderation.blockCountdown <= 0) {
        this.moderation.isBlocked = false;
        this.moderation.infractions = 0;
        clearInterval(this.blockInterval);
        this.blockInterval = null;

        this.messages.push({
          text: '✅ Chat desbloqueado. Recuerda mantener un lenguaje respetuoso. ¿En qué te puedo ayudar?',
          sender: 'assistant',
          timestamp: new Date(),
          type: 'normal'
        });
      }
    }, 1000);
  }

  sendQuickReply(reply: string): void {
    this.newMessage = reply;
    this.showQuickReplies = false;
    this.sendMessage();
  }

  sendMessage() {
    const textToSend = this.newMessage.trim();
    if (!textToSend) return;
    if (this.moderation.isBlocked) return;
    if (textToSend.length > this.maxChars) return;

    // Evaluacion del lado del cliente
    const evalResult = this.moderationService.evaluateContent(textToSend);
    if (!evalResult.allowed) {
      this.messages.push({
        text: textToSend,
        sender: 'user',
        timestamp: new Date(),
        type: 'normal'
      });
      this.newMessage = '';
      this.showQuickReplies = false;
      this.handleInappropriateMessage(evalResult.warningMessage);
      return;
    }

    // Agregar mensaje del usuario
    this.messages.push({
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
      type: 'normal'
    });

    this.newMessage = '';
    this.isTyping = true;
    this.showQuickReplies = false;
    this.scrollToBottom();

    // Enviar al backend
    this.http.post<any>(`${environment.apiUrl}/chat`, {
      mensaje: textToSend,
      session_id: this.sessionId
    }).subscribe({
      next: (res) => {
        this.isTyping = false;

        // Si el backend moderó el contenido
        if (res.moderated) {
          this.moderation.infractions = res.infraction_level || (this.moderation.infractions + 1);
          const warningInfo = this.moderationService.getWarningForInfraction(this.moderation.infractions);
          this.messages.push({
            text: res.respuesta,
            sender: 'assistant',
            timestamp: new Date(),
            type: warningInfo.type
          });
          if (warningInfo.blockSeconds > 0) {
            this.activateChatBlock(warningInfo.blockSeconds);
          }
          return;
        }

        if (res) {
          const respuestaText = res.respuesta;
          const productos = res.productos || [];
          const redirect = res.redirect;

          const links: { label: string; url: string; external?: boolean }[] = [];

          this.messages.push({
            text: respuestaText,
            sender: 'assistant',
            timestamp: new Date(),
            productos: productos,
            links: links,
            type: 'normal'
          });

          if (redirect) {
            const isExternal = redirect.startsWith('http://') || redirect.startsWith('https://');
            const isMaps = redirect.includes('maps');

            let label = 'Ver Sección';
            if (isMaps) {
              label = '📍 Abrir en Google Maps';
            } else if (isExternal) {
              label = 'Ir al enlace';
            }

            links.push({
              label: label,
              url: redirect,
              external: isExternal
            });

            // Si es un enlace de mapas, no cerramos automáticamente el chat para que el usuario pueda leer la dirección
            if (!isMaps) {
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
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isTyping = false;

        // HTTP 429 - Ban / Rate limit desde el servidor
        if (err.status === 429) {
          const retryAfter = err.error?.retry_after_seconds || 60;
          const errorMsg = err.error?.error || 'Has superado el límite de mensajes permitidos. Intenta más tarde.';
          this.messages.push({
            text: `🔒 ${errorMsg}`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'error'
          });
          this.activateChatBlock(retryAfter);
          return;
        }

        console.error('Error en el chat', err);
        this.messages.push({
          text: 'Lo siento, he tenido problemas para responder. ¿Te gustaría que te comunique con un asesor?',
          sender: 'assistant',
          timestamp: new Date(),
          links: [{ label: 'Hablar con Asesor en WhatsApp', url: 'https://wa.me/573006680125', external: true }],
          type: 'error'
        });
      }
    });
  }

  navegarA(url: string, external?: boolean) {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('chat-modal-open');
      document.body.classList.remove('chat-modal-open');
    }
    if (external) {
      window.open(url, '_blank');
    } else {
      this.closeChat.emit();
      this.router.navigateByUrl(url);
    }
  }

  onClose() {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('chat-modal-open');
      document.body.classList.remove('chat-modal-open');
    }
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
        this.showQuickReplies = true;
        this.moderation = { infractions: 0, isBlocked: false, blockCountdown: 0 };
        if (this.blockInterval) { clearInterval(this.blockInterval); this.blockInterval = null; }
      },
      error: (err) => {
        this.isTyping = false;
        console.error('Error al reiniciar chat:', err);
        this.sessionId = this.generateUUID();
        localStorage.setItem('mateo_session_id', this.sessionId);
        this.messages = [];
        this.showQuickReplies = true;
        this.moderation = { infractions: 0, isBlocked: false, blockCountdown: 0 };
        if (this.blockInterval) { clearInterval(this.blockInterval); this.blockInterval = null; }
      }
    });
  }
}
