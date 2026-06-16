import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../enviroments/environment';
import { ProductosService } from '../../../services/productos.service';
import { PedidoService } from '../../../services/pedido.service';

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

  constructor(
    private http: HttpClient, 
    private router: Router,
    private productosService: ProductosService,
    private pedidoService: PedidoService
  ) {}

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

    const queryText = this.newMessage;
    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now(),
      text: queryText,
      sender: 'user',
      timestamp: new Date()
    };
    
    this.messages.push(userMessage);
    this.newMessage = '';
    this.isTyping = true;
    
    setTimeout(() => this.scrollToBottom(), 50);

    const normalizedQuery = queryText.toLowerCase().trim();

    // 1. Detectar intención de stock bajo
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
          // Ordenar por stock ascendente
          const ordenados = [...productos].sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 5);
          
          let responseText = 'Aquí tienes los productos con menor stock:\n';
          ordenados.forEach(prod => {
            const stockVal = prod.stock || 0;
            const alertTag = stockVal <= 5 ? '🚨 CRÍTICO' : (stockVal <= 10 ? '⚠️ BAJO' : '✅ ÓPTIMO');
            responseText += `\n• **${prod.nombre}**: ${stockVal} unidades (${alertTag}) - Precio: $${prod.precio}`;
          });

          this.messages.push({
            id: Date.now(),
            text: responseText,
            sender: 'assistant',
            timestamp: new Date()
          });
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: (err) => {
          console.error(err);
          this.isTyping = false;
          this.messages.push({
            id: Date.now(),
            text: 'Lo siento, no pude obtener el inventario de productos.',
            sender: 'assistant',
            timestamp: new Date()
          });
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
      return;
    }

    // 2. Detectar intención de productos más vendidos / ventas
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
                    ventasPorProducto[pid] = {
                      nombre: detalle.nombre_producto,
                      cantidad: 0,
                      totalVendido: 0
                    };
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

          this.messages.push({
            id: Date.now(),
            text: responseText,
            sender: 'assistant',
            timestamp: new Date()
          });
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: (err) => {
          console.error(err);
          this.isTyping = false;
          this.messages.push({
            id: Date.now(),
            text: 'Lo siento, no pude obtener los datos de ventas.',
            sender: 'assistant',
            timestamp: new Date()
          });
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
      return;
    }

    // 3. Redirecciones
    // Usuarios / clientes
    if (
      normalizedQuery.includes('usuario') ||
      normalizedQuery.includes('cliente') ||
      normalizedQuery.includes('persona') ||
      normalizedQuery.includes('registrado')
    ) {
      this.isTyping = false;
      this.messages.push({
        id: Date.now(),
        text: '¡Entendido! Te estoy llevando a la sección de Usuarios Registrados...',
        sender: 'assistant',
        timestamp: new Date()
      });
      setTimeout(() => {
        this.router.navigate(['/admin/usuarios']);
        this.closeChat();
      }, 1500);
      return;
    }

    // Pedidos / órdenes
    if (
      normalizedQuery.includes('pedido') ||
      normalizedQuery.includes('orden') ||
      normalizedQuery.includes('compra')
    ) {
      this.isTyping = false;
      this.messages.push({
        id: Date.now(),
        text: '¡Entendido! Te estoy llevando a la gestión de Pedidos...',
        sender: 'assistant',
        timestamp: new Date()
      });
      setTimeout(() => {
        this.router.navigate(['/admin/pedidos']);
        this.closeChat();
      }, 1500);
      return;
    }

    // Categorías
    if (normalizedQuery.includes('categoria')) {
      this.isTyping = false;
      this.messages.push({
        id: Date.now(),
        text: 'Te estoy redirigiendo a la gestión de Categorías...',
        sender: 'assistant',
        timestamp: new Date()
      });
      setTimeout(() => {
        this.router.navigate(['/admin/categorias']);
        this.closeChat();
      }, 1500);
      return;
    }

    // Subcategorías
    if (normalizedQuery.includes('subcat')) {
      this.isTyping = false;
      this.messages.push({
        id: Date.now(),
        text: 'Te estoy redirigiendo a la gestión de Subcategorías...',
        sender: 'assistant',
        timestamp: new Date()
      });
      setTimeout(() => {
        this.router.navigate(['/admin/subcategorias']);
        this.closeChat();
      }, 1500);
      return;
    }

    // PQR
    if (normalizedQuery.includes('pqr') || normalizedQuery.includes('mensaje') || normalizedQuery.includes('contacto')) {
      this.isTyping = false;
      this.messages.push({
        id: Date.now(),
        text: 'Te estoy redirigiendo a la gestión de PQR...',
        sender: 'assistant',
        timestamp: new Date()
      });
      setTimeout(() => {
        this.router.navigate(['/admin/pqr-admin']);
        this.closeChat();
      }, 1500);
      return;
    }

    // Fallback: Llamada al backend
    const payload = {
      mensajes: this.messages.map(m => ({
        sender: m.sender,
        text: m.text
      }))
    };

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
          }, 1500);
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
