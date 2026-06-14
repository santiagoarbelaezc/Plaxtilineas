import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <!-- Main Container matches description-producto-select -->
    <div class="bg-white min-h-screen" style="padding-top: calc(var(--navbar-height, 80px)); padding-bottom: 90px; font-family: var(--font-primary, 'Inter', sans-serif); color: #111;">
      
      <div style="max-width: 1550px; margin: 40px auto; padding: 0 2rem;">
        
        <!-- Breadcrumb & Top Action -->
        <nav style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #718096; margin-bottom: 2rem;">
          <a routerLink="/productos" style="color: #111; font-weight: 700; text-decoration: none; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Seguir comprando
          </a>
          <span>›</span>
          <span style="font-weight: 500; text-transform: uppercase;">Finalizar Compra</span>
        </nav>

        <!-- Header matches description-producto-select Title Area -->
        <div style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #111;">
          <h1 style="font-size: 2.2rem; font-weight: 800; color: #111; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Finalizar Compra</h1>
        </div>

        <!-- Layout matches producto-layout-container -->
        <div style="display: grid; grid-template-columns: 1fr 420px; gap: 3rem; min-height: 600px; align-items: start;">
          
          <!-- Columna Izquierda: Los Productos -->
          <div style="display: flex; flex-direction: column; gap: 2rem;">
            
            <div style="display: flex; flex-direction: column;">
              <h2 style="font-size: 1rem; font-weight: 800; color: #111; margin: 0 0 1rem 0; text-transform: uppercase; letter-spacing: 0.05em;">
                Tus Productos ({{ totalCount() }})
              </h2>
              
              <div style="display: flex; flex-direction: column; border-top: 1px solid #e5e5e5;">
                @if (items().length === 0) {
                  <div style="padding: 4rem 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <svg style="color: #ccc; margin-bottom: 1rem;" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    <p style="color: #555; font-size: 1rem; margin: 0;">No hay productos en tu carrito.</p>
                  </div>
                } @else {
                  @for (item of items(); track item.id; let last = $last) {
                    <!-- Item -->
                    <div style="display: grid; grid-template-columns: 120px 1fr auto; gap: 1.5rem; align-items: center; padding: 1.5rem 0; border-bottom: 1px solid #e5e5e5; position: relative;">
                      <div style="background: #f9f9f9; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; border: 1px solid #eee;">
                        @if (item.producto.imagen_url) {
                          <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" style="width: 100%; height: 100%; object-fit: contain; padding: 8px; mix-blend-mode: multiply;">
                        } @else {
                          <svg style="color: #ccc;" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        }
                      </div>
                      
                      <div style="display: flex; flex-direction: column; gap: 0.5rem; padding-right: 2rem;">
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: #111; margin: 0; text-transform: uppercase; line-height: 1.2;">{{ item.producto.nombre }}</h3>
                        <p style="font-size: 0.85rem; color: #555; margin: 0; font-weight: 500;">
                          {{ item.variante ? item.variante.nombre : (item.producto.subcategoria || 'Genérico') }} 
                          <span style="margin: 0 4px;">|</span> {{ item.producto.unidad || 'Unidades' }}
                        </p>
                        <div style="margin-top: 0.25rem;">
                          <span style="font-size: 0.85rem; color: #555; font-weight: 700;">C/U: {{ formatearPrecio(item.precioUnitario) }}</span>
                        </div>
                      </div>
                      
                      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 1rem;">
                        <div style="font-size: 1.3rem; font-weight: 800; color: #111;">{{ formatearPrecio(item.precioUnitario * item.cantidad) }}</div>
                        <div style="display: flex; align-items: center; border: 1px solid #111; height: 36px; width: 100px;">
                          <button 
                            (click)="decreaseQuantity(item.id, item.cantidad)"
                            style="width: 30px; height: 100%; background: #fff; border: none; border-right: 1px solid #111; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #111;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                          <span style="flex: 1; text-align: center; font-weight: 800; font-size: 0.9rem; color: #111;">{{ item.cantidad }}</span>
                          <button 
                            (click)="increaseQuantity(item.id, item.cantidad)"
                            style="width: 30px; height: 100%; background: #fff; border: none; border-left: 1px solid #111; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #111;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                        </div>
                      </div>
                      
                      <button (click)="removeItem(item.id)" style="position: absolute; right: 0; top: 1.5rem; background: transparent; border: none; color: #999; cursor: pointer; padding: 0;" title="Eliminar producto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  }
                }
              </div>
            </div>

            <!-- WhatsApp Support Block (IKEA Style) -->
            <div style="background: #f9f9f9; border: 1px solid #eee; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; margin-top: 1rem;">
              <div style="width: 48px; height: 48px; background: #25D366; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </div>
              <div style="flex: 1;">
                <h3 style="font-size: 0.95rem; font-weight: 800; color: #111; text-transform: uppercase; margin: 0 0 0.25rem 0; letter-spacing: 0.05em;">¿Tienes dudas?</h3>
                <p style="font-size: 0.9rem; color: #555; margin: 0;">Habla con un asesor directamente para resolver cualquier inquietud sobre tu pedido.</p>
              </div>
              <a href="https://wa.me/573000000000" target="_blank" rel="noopener noreferrer" style="flex-shrink: 0; padding: 0.75rem 1.5rem; background: #fff; border: 1px solid #111; color: #111; font-weight: 800; text-transform: uppercase; font-size: 0.85rem; text-decoration: none; display: inline-block;">
                Contactar
              </a>
            </div>

          </div>

          <!-- Columna Derecha: Tarjeta de Resumen / Checkout Fija -->
          <div style="position: sticky; top: calc(var(--navbar-height, 80px) + 20px);">
            <div style="background: #fff; border: 1px solid #e5e5e5; padding: 2rem;">
              <h2 style="font-size: 1rem; font-weight: 800; color: #111; text-transform: uppercase; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 2px solid #111; letter-spacing: 0.05em;">
                Resumen del Pedido
              </h2>
              
              <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; color: #333;">
                  <span>Subtotal ({{ totalCount() }} items)</span>
                  <span style="font-weight: 800; color: #111;">{{ formatearPrecio(totalPrice()) }}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; color: #333;">
                  <span>Envío estimado</span>
                  <span style="color: #666;">A calcular</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; color: #333;">
                  <span>Impuestos (IVA)</span>
                  <span style="font-weight: 800; color: #111;">$0</span>
                </div>
              </div>
              
              <div style="border-top: 1px solid #e5e5e5; padding-top: 1.5rem; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-size: 1.1rem; font-weight: 800; color: #111; text-transform: uppercase;">Total</span>
                  <span style="font-size: 1.8rem; font-weight: 800; color: #111; letter-spacing: -0.02em;">{{ formatearPrecio(totalPrice()) }}</span>
                </div>
                <span style="font-size: 0.75rem; color: #777; text-align: right;">Sujeto a costos extra de envío</span>
              </div>
              
              <button 
                (click)="iniciarCheckout()"
                [disabled]="items().length === 0"
                style="width: 100%; padding: 1.2rem; background: #111; color: #fff; border: none; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.9rem; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.75rem; margin-bottom: 1rem;"
                [style.opacity]="items().length === 0 ? '0.5' : '1'">
                Continuar a pago
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
              
              <a routerLink="/productos" style="width: 100%; padding: 1rem; background: #fff; color: #111; border: 1px solid #ccc; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem; cursor: pointer; text-decoration: none; display: flex; justify-content: center; align-items: center; box-sizing: border-box;">
                Seguir comprando
              </a>

              <!-- Beneficios -->
               <div style="margin-top: 2rem; border-top: 1px solid #e5e5e5; padding-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                 <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: #555; font-weight: 600;">
                   <svg style="color: #111;" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                   Pago 100% Seguro
                 </div>
                 <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: #555; font-weight: 600;">
                   <svg style="color: #111;" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                   Datos Encriptados y Protegidos
                 </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>

    <!-- Checkout Modal (Minimalista / Corporativo) -->
    <div *ngIf="showCheckoutModal()" style="position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(0,0,0,0.6);" (click)="closeCheckout()">
      <div style="background: #fff; width: 100%; max-width: 600px; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);" (click)="$event.stopPropagation()">
        
        <div style="padding: 1.5rem 2rem; border-bottom: 2px solid #111; display: flex; justify-content: space-between; align-items: center; background: #fff;">
          <h2 style="font-size: 1.1rem; font-weight: 800; color: #111; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; display: flex; align-items: center; gap: 0.75rem;">
            <svg style="color: #111;" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            Detalles de Envío
          </h2>
          <button (click)="closeCheckout()" style="background: transparent; border: none; cursor: pointer; padding: 0; color: #999; display: flex;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style="padding: 2rem; overflow-y: auto; max-height: 75vh; background: #fff;">
          <form #checkoutForm="ngForm" (ngSubmit)="confirmarPedido()" style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-size: 0.75rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Dirección completa *</label>
              <input type="text" [(ngModel)]="checkoutData.direccion_envio" name="direccion" required placeholder="Ej: Cra. 14 # 22-10 Apto 301" style="width: 100%; padding: 0.8rem 1rem; border: 1px solid #ccc; font-family: var(--font-primary); font-size: 0.95rem; color: #111; outline: none; box-sizing: border-box;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="font-size: 0.75rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Ciudad *</label>
                <input type="text" [(ngModel)]="checkoutData.ciudad" name="ciudad" required placeholder="Ej: Armenia" style="width: 100%; padding: 0.8rem 1rem; border: 1px solid #ccc; font-family: var(--font-primary); font-size: 0.95rem; color: #111; outline: none; box-sizing: border-box;">
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="font-size: 0.75rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Departamento *</label>
                <input type="text" [(ngModel)]="checkoutData.departamento" name="departamento" required placeholder="Ej: Quindío" style="width: 100%; padding: 0.8rem 1rem; border: 1px solid #ccc; font-family: var(--font-primary); font-size: 0.95rem; color: #111; outline: none; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-size: 0.75rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Teléfono de contacto *</label>
              <input type="tel" [(ngModel)]="checkoutData.telefono_contacto" name="telefono" required placeholder="Ej: 300 123 4567" style="width: 100%; padding: 0.8rem 1rem; border: 1px solid #ccc; font-family: var(--font-primary); font-size: 0.95rem; color: #111; outline: none; box-sizing: border-box;">
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-size: 0.75rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Método de pago</label>
              <select [(ngModel)]="checkoutData.metodo_pago" name="pago" style="width: 100%; padding: 0.8rem 1rem; border: 1px solid #ccc; font-family: var(--font-primary); font-size: 0.95rem; color: #111; outline: none; box-sizing: border-box; background: #fff;">
                <option value="contraentrega">Contraentrega (Pago al recibir)</option>
                <option value="transferencia">Transferencia Bancaria</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-size: 0.75rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Notas adicionales (Opcional)</label>
              <textarea [(ngModel)]="checkoutData.notas" name="notas" rows="2" placeholder="Instrucciones para llegar..." style="width: 100%; padding: 0.8rem 1rem; border: 1px solid #ccc; font-family: var(--font-primary); font-size: 0.95rem; color: #111; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
            </div>

            <!-- Error Feedback -->
            <div *ngIf="checkoutError()" style="padding: 1rem; border: 1px solid #d0021b; color: #d0021b; background: #fff0f0; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {{ checkoutError() }}
            </div>

            <div style="margin-top: 0.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e5e5; display: flex; flex-direction: column; gap: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 1rem; border: 1px solid #eee;">
                <span style="font-size: 0.8rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Total a pagar</span>
                <span style="font-size: 1.4rem; font-weight: 800; color: #111; letter-spacing: -0.02em;">{{ formatearPrecio(totalPrice()) }}</span>
              </div>
              <button 
                type="submit" 
                [disabled]="checkoutForm.invalid || isSubmitting()"
                style="width: 100%; padding: 1.2rem; background: #111; color: #fff; border: none; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.9rem; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.75rem;"
                [style.opacity]="(checkoutForm.invalid || isSubmitting()) ? '0.5' : '1'">
                <span *ngIf="isSubmitting()" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite;"></span>
                Confirmar Compra
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CartSummaryComponent {
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  items = toSignal(this.cartService.items$, { initialValue: [] });
  
  totalCount = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });

  totalPrice = computed(() => {
    return this.items().reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  });

  showCheckoutModal = signal(false);
  isSubmitting = signal(false);
  checkoutError = signal<string | null>(null);

  checkoutData = {
    direccion_envio: '',
    ciudad: '',
    departamento: '',
    telefono_contacto: '',
    metodo_pago: 'contraentrega',
    notas: ''
  };

  increaseQuantity(id: string, current: number) {
    this.cartService.updateQuantity(id, current + 1);
  }

  decreaseQuantity(id: string, current: number) {
    if (current > 1) {
      this.cartService.updateQuantity(id, current - 1);
    }
  }

  removeItem(id: string) {
    if (confirm('¿Deseas eliminar este producto del carrito?')) {
      this.cartService.removeFromCart(id);
    }
  }

  iniciarCheckout(): void {
    if (!this.authService.isLoggedIn.getValue()) {
      alert('Debes iniciar sesión para finalizar tu compra.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    this.showCheckoutModal.set(true);
  }

  closeCheckout(): void {
    this.showCheckoutModal.set(false);
    this.checkoutError.set(null);
  }

  confirmarPedido(): void {
    if (this.isSubmitting()) return;
    
    this.isSubmitting.set(true);
    this.checkoutError.set(null);

    const payload = {
      items: this.items().map(i => ({
        producto_id: i.producto.id,
        variante_id: i.variante?.id,
        cantidad: i.cantidad
      })),
      ...this.checkoutData
    };

    this.pedidoService.crearPedido(payload).subscribe({
      next: (res) => {
        this.cartService.clearCart();
        this.closeCheckout();
        // Redirigir al cliente a su historial de pedidos
        this.router.navigate(['/pedidos']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.checkoutError.set(err.error?.error || 'Ocurrió un error al procesar tu pedido. Inténtalo de nuevo.');
      }
    });
  }

  formatearPrecio(precio: number): string {
    return `$ ${Math.round(precio).toLocaleString('es-ES')}`;
  }
}
