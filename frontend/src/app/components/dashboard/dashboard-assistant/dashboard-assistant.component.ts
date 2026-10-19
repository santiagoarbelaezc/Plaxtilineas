// Asistente Mateo — Plaxtilineas Dashboard (Rediseño y Despliegue Continuo Activo)
import { Component, ElementRef, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../enviroments/environment';
import { ProductosService } from '../../../services/productos.service';
import { PedidoService } from '../../../services/pedido.service';
import { ChatModerationService } from '../../../services/chat-moderation.service';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sent' | 'delivered';
  type?: 'normal' | 'warning' | 'error';
}

interface ModerationState {
  infractions: number;
  isBlocked: boolean;
  blockEndTime: number | null;
  blockCountdown: number;
}

@Component({
  selector: 'app-dashboard-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-assistant.component.html',
  styleUrls: ['./dashboard-assistant.component.css']
})
export class DashboardAssistantComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  isOpen = false;
  isTyping = false;
  newMessage = '';
  maxChars = 500;
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

  // Estado de moderación
  moderation: ModerationState = {
    infractions: 0,
    isBlocked: false,
    blockEndTime: null,
    blockCountdown: 0
  };
  private blockInterval: any = null;

  // Quick replies sugeridas
  quickReplies: string[] = [
    '📦 Stock bajo',
    '📊 Más vendidos',
    '👥 Usuarios',
    '🛒 Pedidos',
    '🏷️ Categorías',
    '📨 PQR'
  ];
  showQuickReplies = true;

  messages: Message[] = [
    {
      id: 1,
      text: '¡Hola! Soy Mateo, el asistente inteligente del sistema. ¿En qué te puedo ayudar hoy con el panel de administración?',
      sender: 'assistant',
      timestamp: new Date(),
      type: 'normal'
    }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private productosService: ProductosService,
    private pedidoService: PedidoService,
    private moderationService: ChatModerationService
  ) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.blockInterval) clearInterval(this.blockInterval);
  }

  // =====================================================
  //  DRAG & DROP
  // =====================================================
  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
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
      event.preventDefault();
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

  reiniciarChat(): void {
    this.messages = [
      {
        id: Date.now(),
        text: '¡Hola! Soy Mateo, el asistente inteligente del sistema. ¿En qué te puedo ayudar hoy con el panel de administración?',
        sender: 'assistant',
        timestamp: new Date(),
        type: 'normal'
      }
    ];
    this.showQuickReplies = true;
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 50);
  }

  get charCount(): number {
    return this.newMessage.length;
  }

  get charCountClass(): string {
    if (this.charCount > 450) return 'char-danger';
    if (this.charCount > 350) return 'char-warn';
    return '';
  }

  // =====================================================
  //  MODERACIÓN DE CONTENIDO
  // =====================================================

  private handleInappropriateMessage(warningMsgOverride?: string): void {
    this.moderation.infractions++;
    this.isTyping = true;

    setTimeout(() => {
      this.isTyping = false;
      const warningInfo = this.moderationService.getWarningForInfraction(this.moderation.infractions);
      const textToDisplay = warningMsgOverride || warningInfo.text;

      this.messages.push({
        id: Date.now(),
        text: textToDisplay,
        sender: 'assistant',
        timestamp: new Date(),
        type: warningInfo.type
      });
      setTimeout(() => this.scrollToBottom(), 50);

      if (warningInfo.blockSeconds > 0) {
        this.activateChatBlock(warningInfo.blockSeconds);
      }
    }, 800);
  }

  private activateChatBlock(seconds: number): void {
    this.moderation.isBlocked = true;
    this.moderation.blockCountdown = seconds;
    this.moderation.blockEndTime = Date.now() + seconds * 1000;

    if (this.blockInterval) clearInterval(this.blockInterval);

    this.blockInterval = setInterval(() => {
      this.moderation.blockCountdown--;
      if (this.moderation.blockCountdown <= 0) {
        this.moderation.isBlocked = false;
        this.moderation.infractions = 0;
        this.moderation.blockEndTime = null;
        clearInterval(this.blockInterval);
        this.blockInterval = null;

        this.messages.push({
          id: Date.now(),
          text: '✅ El chat ha sido desbloqueado. Recuerda mantener un lenguaje respetuoso. ¿En qué te puedo ayudar?',
          sender: 'assistant',
          timestamp: new Date(),
          type: 'normal'
        });
        setTimeout(() => this.scrollToBottom(), 50);
      }
    }, 1000);
  }

  sendQuickReply(reply: string): void {
    this.newMessage = reply;
    this.showQuickReplies = false;
    this.sendMessage();
  }

  sendMessage() {
    const trimmed = this.newMessage.trim();
    if (!trimmed) return;
    if (this.moderation.isBlocked) return;
    if (trimmed.length > this.maxChars) return;

    // Evaluacion del lado del cliente
    const evalResult = this.moderationService.evaluateContent(trimmed);
    if (!evalResult.allowed) {
      this.messages.push({
        id: Date.now(),
        text: trimmed,
        sender: 'user',
        timestamp: new Date(),
        status: 'delivered',
        type: 'normal'
      });
      this.newMessage = '';
      this.showQuickReplies = false;
      setTimeout(() => this.scrollToBottom(), 50);
      this.handleInappropriateMessage(evalResult.warningMessage);
      return;
    }

    const queryText = trimmed;
    const userMessage: Message = {
      id: Date.now(),
      text: queryText,
      sender: 'user',
      timestamp: new Date(),
      status: 'delivered',
      type: 'normal'
    };

    this.messages.push(userMessage);
    this.newMessage = '';
    this.isTyping = true;
    this.showQuickReplies = false;

    setTimeout(() => this.scrollToBottom(), 50);

    const normalizedQuery = queryText.toLowerCase().trim();

    // 1. Stock bajo
    if (
      normalizedQuery.includes('stock') ||
      normalizedQuery.includes('inventario') ||
      normalizedQuery.includes('escasez') ||
      normalizedQuery.includes('pocos') ||
      normalizedQuery.includes('bajo') ||
      normalizedQuery.includes('menos')
    ) {
      this.productosService.obtenerProductos().subscribe({
        next: (productos) => {
          this.isTyping = false;
          const ordenados = [...productos].sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 5);
          let responseText = 'Aquí tienes los productos con menor stock:\n';
          ordenados.forEach(prod => {
            const stockVal = prod.stock || 0;
            const alertTag = stockVal <= 5 ? '🚨 CRÍTICO' : (stockVal <= 10 ? '⚠️ BAJO' : '✅ ÓPTIMO');
            responseText += `\n• **${prod.nombre}**: ${stockVal} unidades (${alertTag}) - Precio: $${prod.precio}`;
          });
          this.messages.push({ id: Date.now(), text: responseText, sender: 'assistant', timestamp: new Date(), type: 'normal' });
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: (err) => {
          console.error(err);
          this.isTyping = false;
          this.messages.push({ id: Date.now(), text: 'Lo siento, no pude obtener el inventario de productos.', sender: 'assistant', timestamp: new Date(), type: 'error' });
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
      return;
    }

    // 2. Ventas / más vendidos
    if (
      normalizedQuery.includes('vendido') ||
      normalizedQuery.includes('ventas') ||
      normalizedQuery.includes('popular') ||
      normalizedQuery.includes('comprado') ||
      normalizedQuery.includes('salida')
    ) {
      this.pedidoService.adminObtenerTodos().subscribe({
        next: (res) => {
          this.isTyping = false;
          const ventasPorProducto: { [id: number]: { nombre: string, cantidad: number, totalVendido: number } } = {};
          if (res && res.pedidos) {
            res.pedidos.forEach(pedido => {
              if (pedido.detalles) {
                pedido.detalles.forEach(detalle => {
                  const pid = detalle.producto_id;
                  if (!ventasPorProducto[pid]) {
                    ventasPorProducto[pid] = { nombre: detalle.nombre_producto, cantidad: 0, totalVendido: 0 };
                  }
                  ventasPorProducto[pid].cantidad += detalle.cantidad;
                  ventasPorProducto[pid].totalVendido += (detalle.subtotal || (detalle.cantidad * detalle.precio_unitario));
                });
              }
            });
          }
          const ordenados = Object.values(ventasPorProducto).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
          let responseText = 'Aquí tienes los productos más vendidos en el sistema:\n';
          ordenados.forEach((item, index) => {
            responseText += `\n${index + 1}. **${item.nombre}**: ${item.cantidad} unidades vendidas (Ingresos: $${item.totalVendido})`;
          });
          this.messages.push({ id: Date.now(), text: responseText, sender: 'assistant', timestamp: new Date(), type: 'normal' });
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: (err) => {
          console.error(err);
          this.isTyping = false;
          this.messages.push({ id: Date.now(), text: 'Lo siento, no pude obtener los datos de ventas.', sender: 'assistant', timestamp: new Date(), type: 'error' });
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
      return;
    }

    // 3. Usuarios / clientes
    if (
      normalizedQuery.includes('usuario') ||
      normalizedQuery.includes('cliente') ||
      normalizedQuery.includes('persona') ||
      normalizedQuery.includes('registrado')
    ) {
      this.isTyping = false;
      this.messages.push({ id: Date.now(), text: '¡Entendido! Te estoy llevando a la sección de Usuarios Registrados...', sender: 'assistant', timestamp: new Date(), type: 'normal' });
      setTimeout(() => { this.router.navigate(['/admin/usuarios']); this.closeChat(); }, 1500);
      return;
    }

    // 4. Pedidos / órdenes
    if (
      normalizedQuery.includes('pedido') ||
      normalizedQuery.includes('orden') ||
      normalizedQuery.includes('compra')
    ) {
      this.isTyping = false;
      this.messages.push({ id: Date.now(), text: '¡Entendido! Te estoy llevando a la gestión de Pedidos...', sender: 'assistant', timestamp: new Date(), type: 'normal' });
      setTimeout(() => { this.router.navigate(['/admin/pedidos']); this.closeChat(); }, 1500);
      return;
    }

    // 5. Categorías
    if (normalizedQuery.includes('categoria')) {
      this.isTyping = false;
      this.messages.push({ id: Date.now(), text: 'Te estoy redirigiendo a la gestión de Categorías...', sender: 'assistant', timestamp: new Date(), type: 'normal' });
      setTimeout(() => { this.router.navigate(['/admin/categorias']); this.closeChat(); }, 1500);
      return;
    }

    // 6. Subcategorías
    if (normalizedQuery.includes('subcat')) {
      this.isTyping = false;
      this.messages.push({ id: Date.now(), text: 'Te estoy redirigiendo a la gestión de Subcategorías...', sender: 'assistant', timestamp: new Date(), type: 'normal' });
      setTimeout(() => { this.router.navigate(['/admin/subcategorias']); this.closeChat(); }, 1500);
      return;
    }

    // 7. PQR
    if (normalizedQuery.includes('pqr') || normalizedQuery.includes('mensaje') || normalizedQuery.includes('contacto')) {
      this.isTyping = false;
      this.messages.push({ id: Date.now(), text: 'Te estoy redirigiendo a la gestión de PQR...', sender: 'assistant', timestamp: new Date(), type: 'normal' });
      setTimeout(() => { this.router.navigate(['/admin/pqr-admin']); this.closeChat(); }, 1500);
      return;
    }

    // Fallback: API backend
    const payload = {
      session_id: 'admin_dashboard',
      mensajes: this.messages.map(m => ({ sender: m.sender, text: m.text }))
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.isTyping = false;

        if (res.moderated) {
          this.messages.push({
            id: Date.now(),
            text: res.respuesta,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'warning'
          });
          setTimeout(() => this.scrollToBottom(), 50);
          return;
        }

        const assistantMsg: Message = {
          id: Date.now(),
          text: res.respuesta || 'Respuesta vacía',
          sender: 'assistant',
          timestamp: new Date(),
          type: 'normal'
        };
        this.messages.push(assistantMsg);
        if (res.redirect) {
          setTimeout(() => this.router.navigateByUrl(res.redirect), 1500);
        }
        if (res.print) {
          setTimeout(() => window.print(), 1000);
        }
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err: HttpErrorResponse) => {
        this.isTyping = false;

        if (err.status === 429) {
          const errorMsg = err.error?.error || 'Has superado el límite de velocidad del chat.';
          this.messages.push({
            id: Date.now(),
            text: `⏱️ ${errorMsg}`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'error'
          });
          this.activateChatBlock(30);
          setTimeout(() => this.scrollToBottom(), 50);
          return;
        }

        this.messages.push({
          id: Date.now(),
          text: 'Lo siento, hubo un error de conexión con la IA.',
          sender: 'assistant',
          timestamp: new Date(),
          type: 'error'
        });
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }
}
