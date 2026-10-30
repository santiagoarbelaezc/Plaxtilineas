import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PedidoService } from '../../services/pedido.service';
import { MisPedidos } from '../mis-pedidos/mis-pedidos';
import { ConfiguracionComponent } from '../configuracion/configuracion.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faUser, faMapMarkerAlt, faShoppingBag, faKey, 
  faSignOutAlt, faStore, faShieldAlt, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';
import { Footer } from '../../shared/layout/footer/footer.component';
import { SocialButtonsComponent } from '../../shared/layout/social-buttons/social-buttons.component';

export type ProfileTab = 'datos' | 'direccion' | 'pedidos' | 'configuracion';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    MisPedidos,
    ConfiguracionComponent,
    FontAwesomeModule,
    Footer,
    SocialButtonsComponent
  ],
  template: `
    <div class="dash-shell">
      
      <!-- ══════════════════════════════════════════════════════════════
           PANEL DE CONTROL SUPERIOR (TIPO DASHBOARD TABS)
           ══════════════════════════════════════════════════════════════ -->
      <header class="top-dashboard-panel">
        
        <!-- Fila 1: Marca, Estado y Acciones Rápidas -->
        <div class="panel-top-bar">
          <div class="panel-brand-box">
            <a routerLink="/" class="brand-link" title="Volver al inicio">
              <div class="brand-icon-box">
                <fa-icon [icon]="faShieldAlt"></fa-icon>
              </div>
              <div class="brand-text-col">
                <span class="brand-name">Plaxtilineas</span>
                <span class="brand-role">PANEL CLIENTE</span>
              </div>
            </a>
            <div class="status-pill">
              <span class="status-dot"></span>
              <span class="status-pill-text">Cuenta Activa</span>
            </div>
          </div>

          <div class="panel-actions-box">
            <!-- Volver a la Tienda -->
            <a routerLink="/" class="btn-panel-action ghost" title="Ir a la tienda">
              <fa-icon [icon]="faStore"></fa-icon>
              <span>Volver a la tienda</span>
            </a>

            <!-- Chip de Usuario -->
            <div class="user-chip">
              <div class="user-avatar-circle">
                <span>{{ getInitials() }}</span>
              </div>
              <div class="user-meta-text">
                <span class="user-name">{{ getFullName() }}</span>
                <span class="user-sub">{{ getEmail() || 'Cliente' }}</span>
              </div>
            </div>

            <!-- Botón Cerrar Sesión -->
            <button type="button" class="btn-panel-action logout" (click)="logout()" title="Cerrar sesión">
              <fa-icon [icon]="faSignOutAlt"></fa-icon>
              <span>Salir</span>
            </button>
          </div>
        </div>

        <!-- Fila 2: Pestañas de Navegación Horizontales -->
        <div class="panel-tabs-bar">
          <nav class="panel-nav-track">
            <!-- 1. Editar datos -->
            <button 
              type="button" 
              class="panel-tab-btn" 
              [class.active]="activeTab() === 'datos'" 
              (click)="setTab('datos')"
              title="Editar datos personales">
              <fa-icon [icon]="faUser" class="tab-icon"></fa-icon>
              <span>Editar datos</span>
            </button>

            <!-- 2. Actualizar dirección -->
            <button 
              type="button" 
              class="panel-tab-btn" 
              [class.active]="activeTab() === 'direccion'" 
              (click)="setTab('direccion')"
              title="Actualizar dirección de envío">
              <fa-icon [icon]="faMapMarkerAlt" class="tab-icon"></fa-icon>
              <span>Dirección de Entrega</span>
            </button>

            <!-- 3. Mis Pedidos -->
            <button 
              type="button" 
              class="panel-tab-btn" 
              [class.active]="activeTab() === 'pedidos'" 
              (click)="setTab('pedidos')"
              title="Historial de compras y pedidos">
              <fa-icon [icon]="faShoppingBag" class="tab-icon"></fa-icon>
              <span>Mis Pedidos</span>
              <span class="tab-badge-pill" *ngIf="pedidosCount() > 0">
                {{ pedidosCount() }}
              </span>
            </button>

            <!-- 4. Configuración -->
            <button 
              type="button" 
              class="panel-tab-btn" 
              [class.active]="activeTab() === 'configuracion'" 
              (click)="setTab('configuracion')"
              title="Seguridad y configuración de cuenta">
              <fa-icon [icon]="faKey" class="tab-icon"></fa-icon>
              <span>Seguridad y Cuenta</span>
            </button>
          </nav>
        </div>

      </header>

      <!-- CANVAS PRINCIPAL (#f4f5f7) -->
      <main class="dash-canvas">
          
          <!-- 1. Editar Datos Personales -->
          <div *ngIf="activeTab() === 'datos'" class="pane-wrapper fade-in">
            <div class="dash-card">
              <div class="card-top-header">
                <div class="card-icon-badge">
                  <fa-icon [icon]="faUser"></fa-icon>
                </div>
                <div class="card-header-titles">
                  <h2 class="card-main-title">Información Personal</h2>
                  <p class="card-sub-title">Actualiza tus nombres, datos de contacto y número de teléfono.</p>
                </div>
              </div>

              <form #profileForm="ngForm" (ngSubmit)="guardarCambios()" class="dash-form">
                <div class="form-grid">
                  <div class="form-group">
                    <label for="nombre">Nombre <span class="required">*</span></label>
                    <input id="nombre" type="text" [(ngModel)]="form.nombre" name="nombre" required minlength="2" placeholder="Tu nombre" class="form-input">
                  </div>

                  <div class="form-group">
                    <label for="apellidos">Apellidos <span class="required">*</span></label>
                    <input id="apellidos" type="text" [(ngModel)]="form.apellidos" name="apellidos" required minlength="2" placeholder="Tus apellidos" class="form-input">
                  </div>

                  <div class="form-group">
                    <label for="telefono">Teléfono de contacto <span class="required">*</span></label>
                    <input id="telefono" type="tel" [(ngModel)]="form.telefono" name="telefono" required pattern="[0-9]{7,15}" placeholder="Ej: 3001234567" class="form-input">
                    <span class="field-hint">Solo números, entre 7 y 15 dígitos.</span>
                  </div>

                  <div class="form-group">
                    <label for="edad">Edad <span class="required">*</span></label>
                    <input id="edad" type="number" [(ngModel)]="form.edad" name="edad" required min="0" max="120" placeholder="Tu edad" class="form-input">
                  </div>
                </div>

                <div class="form-actions-row">
                  <button type="submit" class="btn-dash-primary" [disabled]="profileForm.invalid || isSaving() || !hasChanges()">
                    <span *ngIf="isSaving()" class="spinner"></span>
                    <span>{{ isSaving() ? 'Guardando...' : 'Guardar Cambios' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- 2. Actualizar Dirección -->
          <div *ngIf="activeTab() === 'direccion'" class="pane-wrapper fade-in">
            <div class="dash-card">
              <div class="card-top-header">
                <div class="card-icon-badge">
                  <fa-icon [icon]="faMapMarkerAlt"></fa-icon>
                </div>
                <div class="card-header-titles">
                  <h2 class="card-main-title">Dirección de Entrega</h2>
                  <p class="card-sub-title">Configura tu domicilio principal para el despacho de tus compras.</p>
                </div>
              </div>

              <form #addressForm="ngForm" (ngSubmit)="guardarCambios()" class="dash-form">
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label for="direccion">Dirección completa <span class="required">*</span></label>
                    <input id="direccion" type="text" [(ngModel)]="form.direccion" name="direccion" required minlength="5" placeholder="Ej: Calle 37 N #20-85" class="form-input">
                  </div>

                  <div class="form-group">
                    <label for="departamento">Departamento <span class="required">*</span></label>
                    <select id="departamento" [(ngModel)]="form.departamento" name="departamento" required (change)="onDepartamentoChange()" class="form-select">
                      <option value="">Selecciona departamento</option>
                      <option *ngFor="let dept of departamentosList" [value]="dept">{{ dept }}</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="ciudad">Ciudad <span class="required">*</span></label>
                    <select id="ciudad" [(ngModel)]="form.ciudad" name="ciudad" required [disabled]="!form.departamento" class="form-select">
                      <option value="">Selecciona ciudad</option>
                      <option *ngFor="let ciudad of ciudadesDisponibles" [value]="ciudad">{{ ciudad }}</option>
                    </select>
                  </div>
                </div>

                <div class="form-actions-row">
                  <button type="submit" class="btn-dash-primary" [disabled]="addressForm.invalid || isSaving() || !hasChanges()">
                    <span *ngIf="isSaving()" class="spinner"></span>
                    <span>{{ isSaving() ? 'Guardando...' : 'Guardar Dirección' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- 3. Mis Pedidos (Historial y Tracking idéntico al Dashboard) -->
          <div *ngIf="activeTab() === 'pedidos'" class="fade-in">
            <app-mis-pedidos [isEmbedded]="true"></app-mis-pedidos>
          </div>

          <!-- 4. Configuración (Seguridad y Cuenta) -->
          <div *ngIf="activeTab() === 'configuracion'" class="pane-wrapper fade-in">
            <div class="dash-card">
              <div class="card-top-header">
                <div class="card-icon-badge">
                  <fa-icon [icon]="faKey"></fa-icon>
                </div>
                <div class="card-header-titles">
                  <h2 class="card-main-title">Seguridad y Cuenta</h2>
                  <p class="card-sub-title">Gestiona la privacidad y opciones de tu cuenta de usuario.</p>
                </div>
              </div>

              <app-configuracion [isEmbedded]="true"></app-configuracion>
            </div>
          </div>

        </main>
    </div>

    <app-footer></app-footer>
    <app-social-buttons></app-social-buttons>

    <style>
      /* ==========================================================================
         SISTEMA DE DISEÑO DEL DASHBOARD DEL CLIENTE — PLAXTILINEAS
         Fiel reproducción del Dashboard Admin (#0a0a0a, blanco y acentos verdes)
         ========================================================================== */
      :host {
        --dash-dark-surface: #0a0a0a;
        --dash-dark-surface-2: #141416;
        --dash-dark-border: #1a1a1a;
        --dash-dark-border-subtle: #27272a;
        --dash-bg-canvas: #f4f5f7;
        --dash-card-bg: #ffffff;
        --dash-card-border: #e4e4e7;
        --dash-text-dark: #09090b;
        --dash-text-muted: #71717a;
        --dash-accent-green: #16a34a;
        --dash-accent-green-light: #22c55e;
        --dash-accent-green-glow: rgba(22, 163, 74, 0.45);
        
        --header-h: 74px;
        --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        --font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        
        display: block;
        min-height: 100vh;
        background: var(--dash-bg-canvas);
        font-family: var(--font-family);
        color: var(--dash-text-dark);
        -webkit-font-smoothing: antialiased;
      }

      * {
        box-sizing: border-box;
      }

      /* ── Layout Shell ── */
      .dash-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--dash-bg-canvas);
        position: relative;
        width: 100%;
      }

      /* ══════════════════════════════════════════════════════════════
         PANEL DE CONTROL SUPERIOR HORIZONTAL (#0a0a0a)
         ══════════════════════════════════════════════════════════════ */
      .top-dashboard-panel {
        width: 100%;
        background: var(--dash-dark-surface);
        border-bottom: 1px solid var(--dash-dark-border);
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      }

      /* Fila 1: Marca, Estado y Acciones Rápidas */
      .panel-top-bar {
        max-width: 1360px;
        margin: 0 auto;
        padding: 14px 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .panel-brand-box {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .brand-link {
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
        color: #ffffff;
      }

      .brand-icon-box {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #18181b;
        border: 1px solid #27272a;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--dash-accent-green-light);
        font-size: 17px;
        flex-shrink: 0;
      }

      .brand-text-col {
        display: flex;
        flex-direction: column;
      }

      .brand-name {
        font-weight: 800;
        font-size: 1.1rem;
        letter-spacing: -0.02em;
        color: #ffffff;
        line-height: 1.15;
      }

      .brand-role {
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #a1a1aa;
      }

      /* Status Pill con Verde */
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.3);
        padding: 4px 10px;
        border-radius: 9999px;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--dash-accent-green-light);
        box-shadow: 0 0 8px var(--dash-accent-green-light);
      }

      .status-pill-text {
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--dash-accent-green-light);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      /* Acciones Rápidas (Derecha) */
      .panel-actions-box {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .btn-panel-action {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s ease;
        font-family: inherit;
        border: 1px solid transparent;
      }

      .btn-panel-action.ghost {
        background: #18181b;
        border-color: #27272a;
        color: #e4e4e7;
      }

      .btn-panel-action.ghost:hover {
        background: #27272a;
        color: #ffffff;
        border-color: #3f3f46;
      }

      .btn-panel-action.logout {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.25);
        color: #f87171;
      }

      .btn-panel-action.logout:hover {
        background: rgba(239, 68, 68, 0.22);
        border-color: rgba(239, 68, 68, 0.4);
        color: #ffffff;
      }

      /* Chip de Usuario */
      .user-chip {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 12px 4px 6px;
        background: #18181b;
        border: 1px solid #27272a;
        border-radius: 9999px;
      }

      .user-avatar-circle {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #09090b;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 800;
        border: 1.5px solid var(--dash-accent-green-light);
      }

      .user-meta-text {
        display: flex;
        flex-direction: column;
        text-align: left;
        line-height: 1.2;
      }

      .user-name {
        font-size: 0.78rem;
        font-weight: 700;
        color: #ffffff;
      }

      .user-sub {
        font-size: 0.65rem;
        color: #a1a1aa;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ══════════════════════════════════════════════════════════════
         FILA 2: PESTAÑAS HORIZONTALES (TIPO DASHBOARD TABS)
         ══════════════════════════════════════════════════════════════ */
      .panel-tabs-bar {
        background: #111113;
        border-top: 1px solid #1f1f23;
        padding: 0 28px;
      }

      .panel-nav-track {
        max-width: 1360px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        padding: 8px 0;
      }

      .panel-nav-track::-webkit-scrollbar {
        display: none;
      }

      .panel-tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        padding: 9px 18px;
        border-radius: 10px;
        font-size: 0.86rem;
        font-weight: 600;
        color: #9ca3af;
        background: transparent;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
        font-family: inherit;
      }

      .panel-tab-btn:hover {
        color: #ffffff;
        background: #18181b;
      }

      .panel-tab-btn.active {
        background: #222226;
        color: #ffffff;
        border: 1px solid #333338;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
      }

      .tab-icon {
        font-size: 14px;
        color: #71717a;
        transition: color 0.2s ease;
      }

      .panel-tab-btn:hover .tab-icon {
        color: #d1d5db;
      }

      .panel-tab-btn.active .tab-icon {
        color: var(--dash-accent-green-light);
      }

      .tab-badge-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--dash-accent-green);
        color: #ffffff;
        font-size: 0.68rem;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 9999px;
        margin-left: 4px;
        box-shadow: 0 0 8px var(--dash-accent-green-glow);
      }

      /* ══════════════════════════════════════════════════════════════
         CANVAS INTERNO (#f4f5f7) & TARJETAS
         ══════════════════════════════════════════════════════════════ */
      .dash-canvas {
        width: 94%;
        max-width: 1280px;
        margin: 32px auto 70px;
        flex: 1;
        padding: 0;
      }

      .pane-wrapper {
        width: 100%;
        max-width: 100%;
      }

      .dash-card {
        background: #ffffff;
        border: 1.5px solid var(--dash-card-border);
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .card-top-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding-bottom: 22px;
        margin-bottom: 28px;
        border-bottom: 1px solid #f1f5f9;
      }

      .card-icon-badge {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #0a0a0a;
        color: var(--dash-accent-green-light);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      }

      .card-header-titles {
        display: flex;
        flex-direction: column;
        text-align: left;
        gap: 2px;
      }

      .card-main-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--dash-text-dark);
        margin: 0;
        letter-spacing: -0.015em;
      }

      .card-sub-title {
        font-size: 0.85rem;
        color: var(--dash-text-muted);
        margin: 0;
      }

      /* Formularios */
      .dash-form {
        width: 100%;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 22px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: left;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .required {
        color: #ef4444;
      }

      .form-input, .form-select {
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        padding: 12px 14px;
        color: #0f172a;
        font-size: 0.92rem;
        font-family: inherit;
        outline: none;
        transition: all 0.2s ease;
        width: 100%;
      }

      .form-select {
        cursor: pointer;
      }

      .form-input:focus, .form-select:focus {
        border-color: var(--dash-accent-green);
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
      }

      .field-hint {
        font-size: 0.76rem;
        color: #94a3b8;
      }

      .form-actions-row {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #f1f5f9;
        display: flex;
        justify-content: flex-end;
      }

      .btn-dash-primary {
        background: #09090b;
        color: #ffffff;
        font-size: 0.88rem;
        font-weight: 700;
        padding: 13px 28px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        letter-spacing: -0.01em;
      }

      .btn-dash-primary:hover:not(:disabled) {
        background: var(--dash-accent-green);
        transform: translateY(-1px);
        box-shadow: 0 8px 24px var(--dash-accent-green-glow);
      }

      .btn-dash-primary:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .spinner {
        width: 15px;
        height: 15px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .fade-in {
        animation: fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Responsivo */
      @media (max-width: 900px) {
        .panel-top-bar {
          flex-direction: column;
          align-items: stretch;
          padding: 14px 16px;
          gap: 12px;
        }

        .panel-brand-box {
          justify-content: space-between;
          width: 100%;
        }

        .panel-actions-box {
          justify-content: space-between;
          width: 100%;
          flex-wrap: wrap;
          gap: 8px;
        }

        .user-chip {
          order: -1;
          width: 100%;
          justify-content: flex-start;
        }

        .user-sub {
          max-width: none;
        }

        .panel-tabs-bar {
          padding: 0 12px;
        }

        .panel-nav-track {
          gap: 6px;
          padding: 6px 0;
        }

        .panel-tab-btn {
          padding: 8px 14px;
          font-size: 0.8rem;
        }

        .dash-canvas {
          width: 100%;
          padding: 16px 12px 50px;
          margin: 16px auto 40px;
        }

        .dash-card {
          padding: 20px 16px;
          border-radius: 12px;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `
})
export class PerfilComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private pedidoService = inject(PedidoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private destroy$ = new Subject<void>();

  // Íconos FontAwesome
  faUser = faUser;
  faMapMarkerAlt = faMapMarkerAlt;
  faShoppingBag = faShoppingBag;
  faKey = faKey;
  faSignOutAlt = faSignOutAlt;
  faStore = faStore;
  faShieldAlt = faShieldAlt;
  faCheckCircle = faCheckCircle;

  activeTab = signal<ProfileTab>('datos');
  isSaving = signal<boolean>(false);
  pedidosCount = signal<number>(0);

  form = {
    nombre: '',
    apellidos: '',
    telefono: '',
    edad: 0,
    direccion: '',
    departamento: '',
    ciudad: ''
  };

  initialForm = {
    nombre: '',
    apellidos: '',
    telefono: '',
    edad: 0,
    direccion: '',
    departamento: '',
    ciudad: ''
  };

  departamentos: { [key: string]: string[] } = {
    "Amazonas": ["Leticia", "Puerto Nariño"],
    "Antioquia": ["Medellín", "Bello", "Envigado", "Itagüí", "Rionegro"],
    "Arauca": ["Arauca", "Saravena", "Tame"],
    "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Puerto Colombia"],
    "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona"],
    "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá"],
    "Caldas": ["Manizales", "La Dorada", "Chinchiná", "Villamaría"],
    "Caquetá": ["Florencia", "San Vicente del Caguán", "El Doncello"],
    "Casanare": ["Yopal", "Aguazul", "Villanueva"],
    "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
    "Cesar": ["Valledupar", "Aguachica", "Bosconia"],
    "Chocó": ["Quibdó", "Istmina", "Condoto"],
    "Córdoba": ["Montería", "Cereté", "Lorica", "Sahagún"],
    "Cundinamarca": ["Soacha", "Zipaquirá", "Facatativá", "Chía", "Fusagasugá"],
    "Guainía": ["Inírida"],
    "Guaviare": ["San José del Guaviare", "Calamar"],
    "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia", "Fonseca"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Fundación"],
    "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López"],
    "Nariño": ["Pasto", "Ipiales", "Tumaco", "Túquerres"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario"],
    "Putumayo": ["Mocoa", "Puerto Asís", "Orito"],
    "Quindío": ["Armenia", "Calarcá", "Montenegro", "La Tebaida"],
    "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
    "San Andrés y Providencia": ["San Andrés", "Providencia"],
    "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"],
    "Sucre": ["Sincelejo", "Corozal", "San Marcos"],
    "Tolima": ["Ibagué", "Espinal", "Melgar", "Honda"],
    "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago", "Buga"],
    "Vaupés": ["Mitú"],
    "Vichada": ["Puerto Carreño", "La Primavera"],
    "Bogotá D.C.": ["Bogotá"]
  };

  departamentosList: string[] = Object.keys(this.departamentos);
  ciudadesDisponibles: string[] = [];

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam && ['datos', 'direccion', 'pedidos', 'configuracion'].includes(tabParam)) {
        this.activeTab.set(tabParam as ProfileTab);
      }
    });

    const user = this.authService.currentUser.getValue();
    if (user) {
      this.cargarDatosUsuario(user);
    } else {
      this.authService.checkToken();
      this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(u => {
        if (u) {
          this.cargarDatosUsuario(u);
        }
      });
    }

    // Cargar conteo de pedidos para el badge verde
    this.cargarConteoPedidos();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarConteoPedidos() {
    this.pedidoService.obtenerMisPedidos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const list = data?.pedidos || [];
        this.pedidosCount.set(list.length);
      },
      error: () => {
        // En caso de error silencioso
      }
    });
  }

  setTab(tab: ProfileTab) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  getHeaderTitle(): string {
    switch (this.activeTab()) {
      case 'datos': return 'Editar Datos Personales';
      case 'direccion': return 'Dirección de Entrega';
      case 'pedidos': return 'Gestión de Pedidos';
      case 'configuracion': return 'Configuración de Cuenta';
      default: return 'Mi Cuenta';
    }
  }

  getHeaderSubtitle(): string {
    switch (this.activeTab()) {
      case 'datos': return 'Visualiza, gestiona y actualiza tu información de contacto';
      case 'direccion': return 'Administra tu ubicación registrada para despachos y envíos';
      case 'pedidos': return 'Visualiza, rastrea y descarga los comprobantes de tus compras';
      case 'configuracion': return 'Ajustes de privacidad, acceso y estado de tu cuenta';
      default: return 'Portal del Cliente Plaxtilineas';
    }
  }

  cargarDatosUsuario(user: any) {
    this.form.nombre = user.nombre || '';
    this.form.apellidos = user.apellidos || '';
    this.form.telefono = user.telefono || '';
    this.form.edad = user.edad || 0;
    this.form.direccion = user.direccion || '';

    if (user.ciudad) {
      const parts = user.ciudad.split(',');
      if (parts.length > 1) {
        this.form.departamento = parts[1].trim();
        this.ciudadesDisponibles = this.departamentos[this.form.departamento] || [];
        this.form.ciudad = parts[0].trim();
      } else {
        this.form.ciudad = user.ciudad.trim();
      }
    }

    this.initialForm = { ...this.form };
  }

  hasChanges(): boolean {
    return (
      this.form.nombre !== this.initialForm.nombre ||
      this.form.apellidos !== this.initialForm.apellidos ||
      this.form.telefono !== this.initialForm.telefono ||
      Number(this.form.edad) !== Number(this.initialForm.edad) ||
      this.form.direccion !== this.initialForm.direccion ||
      this.form.departamento !== this.initialForm.departamento ||
      this.form.ciudad !== this.initialForm.ciudad
    );
  }

  onDepartamentoChange() {
    this.ciudadesDisponibles = this.form.departamento ? (this.departamentos[this.form.departamento] || []) : [];
    this.form.ciudad = '';
  }

  getInitials(): string {
    const n = this.form.nombre.trim();
    const a = this.form.apellidos.trim();
    if (n && a) {
      return (n[0] + a[0]).toUpperCase();
    }
    return n ? n[0].toUpperCase() : 'U';
  }

  getFullName(): string {
    return `${this.form.nombre} ${this.form.apellidos}`.trim() || 'Usuario';
  }

  getEmail(): string {
    return this.authService.currentUser.getValue()?.correo || '';
  }

  logout() {
    Swal.fire({
      title: '¿Cerrar Sesión?',
      text: '¿Estás seguro de que deseas salir de tu cuenta?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#71717a'
    }).then(result => {
      if (result.isConfirmed) {
        this.authService.logout();
      }
    });
  }

  guardarCambios() {
    if (this.isSaving()) return;

    this.isSaving.set(true);

    const fullCiudad = `${this.form.ciudad}, ${this.form.departamento}`;
    const payload = {
      nombre: this.form.nombre,
      apellidos: this.form.apellidos,
      telefono: this.form.telefono,
      edad: this.form.edad,
      direccion: this.form.direccion,
      ciudad: fullCiudad
    };

    this.authService.actualizarPerfil(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.initialForm = { ...this.form };
        Swal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Tus datos han sido actualizados con éxito.',
          confirmButtonColor: '#16a34a'
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.error || 'No se pudo actualizar tu perfil. Intenta de nuevo.';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }
}
