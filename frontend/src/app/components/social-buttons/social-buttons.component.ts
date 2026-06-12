import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, inject, computed } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContactoAsistente } from '../contacto-asistente/contacto-asistente.component';
import { ChatService } from '../../services/chat.service';
import { CartService } from '../../services/cart.service';
import { Subscription } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-social-buttons',
  standalone: true,
  imports: [CommonModule, ContactoAsistente, RouterModule],
  templateUrl: './social-butoons.component.html',
  styleUrls: ['./social-buttons.component.css']
})
export class SocialButtonsComponent implements OnInit, OnDestroy {
  
  private helpMessageTimeout: any;
  private chatSubscription?: Subscription;
  private cartService = inject(CartService);

  // Estado para mostrar/ocultar mensajes
  showHelpMessage = false;
  hoveredButton: string | null = null;
  isChatOpen = false;
  isCartOpen = false;

  // Señales reactivas del carrito
  items = toSignal(this.cartService.items$, { initialValue: [] });

  totalCount = computed(() =>
    this.items().reduce((acc, item) => acc + item.cantidad, 0)
  );

  totalPrice = computed(() =>
    this.items().reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0)
  );

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.chatSubscription = this.chatService.isChatOpen$.subscribe(isOpen => {
      this.isChatOpen = isOpen;
    });

    if (isPlatformBrowser(this.platformId)) {
      this.helpMessageTimeout = setTimeout(() => {
        this.showHelpMessage = true;
        setTimeout(() => this.showHelpMessage = false, 4000);
      }, 3000);
    }
  }

  ngOnDestroy(): void {
    if (this.helpMessageTimeout) clearTimeout(this.helpMessageTimeout);
    if (this.chatSubscription) this.chatSubscription.unsubscribe();
  }

  toggleChat(): void {
    this.chatService.toggleChat();
  }

  toggleCartPanel(): void {
    this.isCartOpen = !this.isCartOpen;
    if (this.isCartOpen && this.isChatOpen) {
      this.chatService.toggleChat(); // Cierra el asistente si abre el carrito
    }
  }

  closeCartPanel(): void {
    this.isCartOpen = false;
  }

  increaseQuantity(id: string, current: number) {
    this.cartService.updateQuantity(id, current + 1);
  }

  decreaseQuantity(id: string, current: number) {
    if (current > 1) this.cartService.updateQuantity(id, current - 1);
  }

  removeItem(id: string) {
    this.cartService.removeFromCart(id);
  }

  formatearPrecio(precio: number): string {
    return `$ ${Math.round(precio).toLocaleString('es-ES')}`;
  }

  onMouseEnter(buttonType: string): void {
    this.hoveredButton = buttonType;
    if (this.showHelpMessage) this.showHelpMessage = false;
  }

  onMouseLeave(buttonType: string): void {
    setTimeout(() => {
      if (this.hoveredButton === buttonType) this.hoveredButton = null;
    }, 300);
  }

  closeHelpMessage(): void {
    this.showHelpMessage = false;
  }
}