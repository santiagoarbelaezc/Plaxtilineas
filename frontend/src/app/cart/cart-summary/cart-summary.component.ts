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
    <style>
      .mobile-only {
        display: block !important;
      }
      .desktop-only {
        display: none !important;
      }
      @media (min-width: 768px) {
        .mobile-only {
          display: none !important;
        }
        .desktop-only {
          display: block !important;
        }
      }
      @keyframes modalEnter {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    </style>
    <app-navbar></app-navbar>

    <!-- 1. Diseño Móvil (No Flotante, alineado con el navbar) -->
    <div class="mobile-only bg-white min-h-screen font-sans" style="padding-top: 100px; padding-bottom: 180px;">
      <!-- Header del Carrito (Estilo Móvil) -->
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-[80px] z-10">
        <button (click)="goBack()" class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-800 active:scale-95 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        
        <h2 class="font-extrabold text-[17px] text-gray-900 tracking-tight uppercase">Mi Carrito ({{ totalCount() }})</h2>
        
        @if (items().length > 0) {
          <button (click)="clearCart()" class="text-xs font-bold text-red-500 hover:text-red-600 active:scale-95 transition-all uppercase tracking-wider">
            Vaciar
          </button>
        } @else {
          <div class="w-10"></div>
        }
      </div>

      <!-- Cuerpo / Lista de Productos (Estilo Móvil) -->
      <div class="px-5 py-4 space-y-4 bg-gray-50/50">
        @if (items().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 text-center px-6">
            <div class="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 border border-gray-100/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Tu carrito está vacío</h3>
            <p class="text-sm text-gray-500 max-w-xs mb-6">Agrega los mejores productos plásticos y empaques de nuestro catálogo.</p>
            <button routerLink="/productos" class="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-[#368c44] to-[#25d366] text-white font-extrabold text-sm uppercase tracking-wider shadow-md active:scale-[0.98] transition-all">
              Ver Catálogo
            </button>
          </div>
        } @else {
          @for (item of items(); track item.id) {
            <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-4 relative">
              <!-- Imagen -->
              <div class="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100 overflow-hidden">
                @if (item.producto.imagen_url) {
                  <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" class="w-full h-full object-contain p-2 mix-blend-multiply">
                } @else {
                  <svg class="text-gray-300" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                }
              </div>

              <!-- Info y Controles -->
              <div class="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h4 class="font-bold text-sm text-gray-900 leading-snug truncate pr-6">{{ item.producto.nombre }}</h4>
                  <p class="text-xs text-gray-400 font-medium mt-0.5">{{ item.variante?.nombre || item.producto.subcategoria || 'Genérico' }}</p>
                  @if (item.producto.controlar_stock && item.producto.stock !== undefined) {
                    <p class="text-[10px] text-orange-600 font-semibold mt-0.5">{{ item.producto.stock - item.cantidad }} disponibles</p>
                  }
                </div>

                <div class="flex items-center justify-between mt-3">
                  <!-- Controles Cantidad -->
                  <div class="flex items-center gap-3 bg-gray-50 rounded-xl p-1 border border-gray-100">
                    <button (click)="decreaseQuantity(item.id, item.cantidad)" class="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 font-extrabold active:scale-90 transition-all border border-gray-100">−</button>
                    <span class="w-6 text-center text-sm font-bold text-gray-900">{{ item.cantidad }}</span>
                    <button (click)="increaseQuantity(item.id, item.cantidad)" 
                            [disabled]="isAtMaxStock(item)"
                            [class.opacity-40]="isAtMaxStock(item)"
                            [class.cursor-not-allowed]="isAtMaxStock(item)"
                            class="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 font-extrabold active:scale-90 transition-all border border-gray-100">+</button>
                  </div>

                  <!-- Precio Subtotal -->
                  <div class="text-right">
                    <span class="text-xs text-gray-400 block font-medium">Subtotal</span>
                    <span class="font-extrabold text-sm text-[#368c44]">{{ formatearPrecio(item.precioUnitario * item.cantidad) }}</span>
                  </div>
                </div>
              </div>

              <!-- Botón Eliminar -->
              <button (click)="removeItem(item.id)" class="absolute top-3 right-3 text-gray-300 hover:text-red-500 active:scale-90 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          }

          <!-- Support Block (Móvil) -->
          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div style="width: 40px; height: 40px; background: #25D366; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wide">¿Tienes dudas?</h4>
              <p class="text-[11px] text-gray-500 leading-tight">Habla con un asesor directamente sobre tu pedido.</p>
            </div>
            <a [href]="contactarAsesorWhatsApp()" target="_blank" rel="noopener noreferrer" class="px-3 py-2 bg-white border border-gray-900 text-gray-900 font-extrabold text-[11px] uppercase tracking-wider rounded-xl active:scale-95 transition-all text-center text-decoration-none">
              Contactar
            </a>
          </div>

          <!-- Barra de Finalizar Compra Fija (Estilo App Móvil) -->
          <div class="fixed bottom-[60px] left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex items-center justify-between gap-4 z-50">
            <div class="flex flex-col text-left">
              <span class="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total</span>
              <span class="text-lg font-extrabold text-[#368c44] tracking-tight">{{ formatearPrecio(totalPrice()) }}</span>
            </div>

            <button 
              (click)="iniciarCheckout()"
              [disabled]="items().length === 0"
              class="flex-1 max-w-[220px] py-3.5 rounded-2xl bg-gradient-to-r from-[#368c44] to-[#25d366] text-white font-extrabold text-sm uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.96] transition-all flex items-center justify-center gap-2 border-none">
              <span>Finalizar Pedido</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        }
      </div>
    </div>

    <!-- 2. Diseño Desktop original -->
    <div class="desktop-only bg-white min-h-screen" style="padding-top: calc(var(--navbar-height, 80px)); padding-bottom: 90px; font-family: var(--font-primary, 'Montserrat', sans-serif); color: #111;">
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

        <!-- Header -->
        <div style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #111;">
          <h1 style="font-size: 2.2rem; font-weight: 800; color: #111; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Finalizar Compra</h1>
        </div>

        <!-- Layout -->
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
                        @if (item.producto.controlar_stock && item.producto.stock !== undefined) {
                          <div style="font-size: 0.75rem; color: #d97706; font-weight: 700; margin-top: 2px;">
                            {{ item.producto.stock - item.cantidad }} disponibles
                          </div>
                        }
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
                             [disabled]="isAtMaxStock(item)"
                             [style.opacity]="isAtMaxStock(item) ? '0.4' : '1'"
                             [style.cursor]="isAtMaxStock(item) ? 'not-allowed' : 'pointer'"
                             style="width: 30px; height: 100%; background: #fff; border: none; border-left: 1px solid #111; display: flex; align-items: center; justify-content: center; color: #111;">
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

            <!-- Support Block -->
            <div style="background: #f9f9f9; border: 1px solid #eee; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; margin-top: 1rem;">
              <div style="width: 48px; height: 48px; background: #25D366; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </div>
              <div style="flex: 1;">
                <h3 style="font-size: 0.95rem; font-weight: 800; color: #111; text-transform: uppercase; margin: 0 0 0.25rem 0; letter-spacing: 0.05em;">¿Tienes dudas?</h3>
                <p style="font-size: 0.9rem; color: #555; margin: 0;">Habla con un asesor directamente para resolver cualquier inquietud sobre tu pedido.</p>
              </div>
              <a [href]="contactarAsesorWhatsApp()" target="_blank" rel="noopener noreferrer" style="flex-shrink: 0; padding: 0.75rem 1.5rem; background: #fff; border: 1px solid #111; color: #111; font-weight: 800; text-transform: uppercase; font-size: 0.85rem; text-decoration: none; display: inline-block;">
                Contactar
              </a>
            </div>
          </div>

          <!-- Columna Derecha -->
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

    <!-- Checkout Modal -->
    <div *ngIf="showCheckoutModal()" style="position: fixed; inset: 0; z-index: 100002; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(0,0,0,0.6);" (click)="closeCheckout()">
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
            
            <div style="background-color: rgba(54, 140, 68, 0.06); border: 1px solid rgba(54, 140, 68, 0.15); border-radius: 12px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px; color: #2d6a4f;">
              <svg style="flex-shrink: 0; margin-top: 2px;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div style="display: flex; flex-direction: column; gap: 2px; text-align: left;">
                <span style="font-weight: 800; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.02em;">¿Dirección correcta?</span>
                <span style="font-size: 0.82rem; font-weight: 500; opacity: 0.9;">Hemos rellenado estos campos con los datos de tu registro. Por favor verifica que tu dirección, ciudad y teléfono sean correctos antes de finalizar tu compra.</span>
              </div>
            </div>

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

    <!-- Auth Required Modal -->
    <div *ngIf="showAuthModal()" style="position: fixed; inset: 0; z-index: 100003; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);" (click)="closeAuthModal()">
      <div style="background: #ffffff; width: 100%; max-width: 440px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3); border: 1px solid rgba(0, 0, 0, 0.05); padding: 36px 32px; overflow: hidden; animation: modalEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1);" (click)="$event.stopPropagation()">
        <!-- Header with beautiful icon -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 24px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background-color: rgba(54, 140, 68, 0.1); color: #368c44; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          
          <h2 style="font-size: 1.35rem; font-weight: 800; color: #1e293b; margin: 0 0 10px 0; letter-spacing: -0.02em; text-transform: uppercase;">
            Iniciar sesión requerida
          </h2>
          
          <p style="font-size: 0.9rem; font-weight: 500; color: #64748b; line-height: 1.5; margin: 0;">
            Para finalizar tu compra y guardar tus productos de manera segura, por favor inicia sesión o crea una cuenta en Plaxtilineas.
          </p>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
          <!-- Iniciar Sesión Button -->
          <button (click)="navigateToLogin()" style="width: 100%; padding: 14px; background-color: #111111; color: #ffffff; border-radius: 12px; font-weight: 700; font-size: 0.95rem; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s ease;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Iniciar Sesión
          </button>
          
          <!-- Registrarse Button -->
          <button (click)="navigateToRegister()" style="width: 100%; padding: 14px; background-color: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s ease;">
            Crear una cuenta
          </button>
          
          <!-- Cancel Button -->
          <button (click)="closeAuthModal()" style="width: 100%; padding: 10px; background: transparent; color: #64748b; border: none; font-weight: 700; font-size: 0.88rem; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s ease; margin-top: 4px;">
            Cancelar
          </button>
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
  showAuthModal = signal(false);
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

  clearCart() {
    if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
      this.cartService.clearCart();
    }
  }

  goBack(): void {
    window.history.back();
  }

  iniciarCheckout(): void {
    if (!this.authService.isLoggedIn.getValue()) {
      this.showAuthModal.set(true);
      return;
    }

    // Auto-completar datos con la información del registro del usuario
    const user = this.authService.currentUser.getValue();
    if (user) {
      if (user.direccion) {
        this.checkoutData.direccion_envio = user.direccion;
      }
      if (user.telefono) {
        this.checkoutData.telefono_contacto = user.telefono;
      }
      if (user.ciudad) {
        const parts = user.ciudad.split(',');
        if (parts.length > 1) {
          this.checkoutData.ciudad = parts[0].trim();
          this.checkoutData.departamento = parts[1].trim();
        } else {
          this.checkoutData.ciudad = user.ciudad.trim();
        }
      }
    }

    this.showCheckoutModal.set(true);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  navigateToLogin(): void {
    this.closeAuthModal();
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
  }

  navigateToRegister(): void {
    this.closeAuthModal();
    this.router.navigate(['/login'], { queryParams: { mode: 'register', returnUrl: '/carrito' } });
  }

  closeCheckout(): void {
    this.showCheckoutModal.set(false);
    this.checkoutError.set(null);
  }

  isAtMaxStock(item: any): boolean {
    return this.cartService.isAtMaxStock(item);
  }

  contactarAsesorWhatsApp(): string {
    const items = this.items();
    let mensaje = `👋 *Hola, necesito asesoría para mi compra en Plaxtilineas*\n\n`;
    mensaje += `*Detalle de mi carrito:*\n`;
    items.forEach(item => {
      const nombre = item.producto.nombre;
      const detalle = item.variante ? item.variante.nombre : (item.producto.subcategoria || 'General');
      mensaje += `🔹 *${nombre}* (${detalle})\n`;
      mensaje += `   Cantidad: ${item.cantidad} | Subtotal: ${this.formatearPrecio(item.precioUnitario * item.cantidad)}\n\n`;
    });
    mensaje += `💰 *Valor Total Estimado:* ${this.formatearPrecio(this.totalPrice())}\n\n`;
    mensaje += `¿Me podrían ayudar con unas dudas que tengo para finalizar mi pedido? ¡Muchas gracias!`;
    return `https://wa.me/573007365939?text=${encodeURIComponent(mensaje)}`;
  }

  generarMensajeWhatsApp(orderId?: number): string {
    const items = this.items();
    let mensaje = `🛒 *Nuevo Pedido desde Plaxtilineas${orderId ? ` (#` + orderId + ')' : ''}*\n\n`;
    mensaje += `*Datos de Envío:*\n`;
    mensaje += `• *Dirección:* ${this.checkoutData.direccion_envio}\n`;
    mensaje += `• *Ciudad:* ${this.checkoutData.ciudad} - ${this.checkoutData.departamento}\n`;
    mensaje += `• *Teléfono:* ${this.checkoutData.telefono_contacto}\n`;
    mensaje += `• *Método de pago:* ${this.checkoutData.metodo_pago === 'contraentrega' ? 'Contraentrega (Pago al recibir)' : 'Transferencia Bancaria'}\n`;
    if (this.checkoutData.notas) {
      mensaje += `• *Notas:* ${this.checkoutData.notas}\n`;
    }
    mensaje += `\n*Productos:*\n`;
    items.forEach(item => {
      const nombre = item.variante ? `${item.producto.nombre} (${item.variante.nombre})` : item.producto.nombre;
      mensaje += `• ${nombre} x${item.cantidad} — ${this.formatearPrecio(item.precioUnitario * item.cantidad)}\n`;
    });
    mensaje += `\n*Total: ${this.formatearPrecio(this.totalPrice())}*\n\n`;
    mensaje += `Quedo atento a la confirmación. ¡Gracias!`;
    return mensaje;
  }

  confirmarPedido(): void {
    if (this.isSubmitting()) return;
    
    this.isSubmitting.set(true);
    this.checkoutError.set(null);

    const itemsPayload = this.items().map(i => ({
      producto_id: i.producto.id,
      variante_id: i.variante?.id,
      cantidad: i.cantidad
    }));

    // Primero verificamos el stock en backend
    this.cartService.verificarStockEnBackend(itemsPayload).subscribe({
      next: (stockRes) => {
        if (!stockRes.valido) {
          this.isSubmitting.set(false);
          const errores = stockRes.items_con_error.map(err => `${err.nombre || 'Producto'}: ${err.error}`).join(', ');
          this.checkoutError.set(`Error de stock: ${errores}`);
          return;
        }

        // Si el stock es válido, creamos el pedido
        const payload = {
          items: itemsPayload,
          ...this.checkoutData
        };

        this.pedidoService.crearPedido(payload).subscribe({
          next: (res: any) => {
            const orderId = res.pedido_id || res.id;
            const message = this.generarMensajeWhatsApp(orderId);
            const whatsappUrl = `https://wa.me/573007365939?text=${encodeURIComponent(message)}`;
            
            // Abrir WhatsApp en nueva pestaña/ventana
            window.open(whatsappUrl, '_blank');
            
            this.cartService.clearCart();
            this.closeCheckout();
            this.router.navigate(['/pedidos']);
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.checkoutError.set(err.error?.error || 'Ocurrió un error al procesar tu pedido. Inténtalo de nuevo.');
          }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.checkoutError.set('Error al verificar el stock. Inténtalo de nuevo.');
      }
    });
  }

  formatearPrecio(precio: number): string {
    return `$ ${Math.round(precio).toLocaleString('es-ES')}`;
  }
}

