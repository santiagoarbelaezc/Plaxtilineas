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
  faSignOutAlt, faChevronLeft, faChevronRight, faHome,
  faStore, faShieldAlt, faCheckCircle, faBars, faTimes
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
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
    NavbarComponent,
    Footer,
    SocialButtonsComponent
  ],
  template: `
    <app-navbar></app-navbar>

    <div class="dash-shell" [class.sidebar-collapsed]="isSidebarCollapsed()">
      
      <!-- ══════════════════════════════════════════════════════════════
           SIDEBAR LATERAL IZQUIERDO (#0a0a0a) — IDÉNTICO AL DASHBOARD
           ══════════════════════════════════════════════════════════════ -->
      <aside class="dash-sidebar" [class.mobile-open]="isMobileSidebarOpen()">
        
        <!-- Botón Flotante para Colapsar el Sidebar -->
        <button 
          type="button"
          class="sidebar-toggle" 
          (click)="toggleSidebarCollapse()" 
          [attr.aria-label]="isSidebarCollapsed() ? 'Expandir menú' : 'Colapsar menú'"
          [title]="isSidebarCollapsed() ? 'Expandir menú' : 'Colapsar menú'">
          <fa-icon [icon]="isSidebarCollapsed() ? faChevronRight : faChevronLeft" class="toggle-icon"></fa-icon>
        </button>

        <!-- Marca / Logo de la Tienda -->
        <div class="sidebar-brand">
          <a routerLink="/perfil" class="brand-link" (click)="closeMobileSidebar()">
            <div class="brand-icon-box">
              <fa-icon [icon]="faShieldAlt"></fa-icon>
            </div>
            <div class="brand-text-col" *ngIf="!isSidebarCollapsed()">
              <span class="brand-name">Plaxtilineas</span>
              <span class="brand-role">PANEL CLIENTE</span>
            </div>
          </a>
        </div>

        <!-- Menú de Navegación Principal -->
        <nav class="sidebar-nav">
          <div class="nav-section-label" *ngIf="!isSidebarCollapsed()">Mi Cuenta</div>
          <ul class="nav-list">
            
            <!-- 1. Editar datos -->
            <li class="nav-item">
              <button type="button" 
                      class="nav-link" 
                      [class.active]="activeTab() === 'datos'" 
                      (click)="setTab('datos')" 
                      title="Editar datos personales">
                <fa-icon [icon]="faUser" class="nav-icon"></fa-icon>
                <span class="nav-label" *ngIf="!isSidebarCollapsed()">Editar datos</span>
              </button>
            </li>

            <!-- 2. Actualizar dirección -->
            <li class="nav-item">
              <button type="button" 
                      class="nav-link" 
                      [class.active]="activeTab() === 'direccion'" 
                      (click)="setTab('direccion')" 
                      title="Actualizar dirección de envío">
                <fa-icon [icon]="faMapMarkerAlt" class="nav-icon"></fa-icon>
                <span class="nav-label" *ngIf="!isSidebarCollapsed()">Dirección</span>
              </button>
            </li>

            <!-- 3. Mis Pedidos (con Badge Verde en lugar de rojo) -->
            <li class="nav-item">
              <button type="button" 
                      class="nav-link" 
                      [class.active]="activeTab() === 'pedidos'" 
                      (click)="setTab('pedidos')" 
                      title="Historial de compras y pedidos">
                <fa-icon [icon]="faShoppingBag" class="nav-icon"></fa-icon>
                <span class="nav-label" *ngIf="!isSidebarCollapsed()">Mis Pedidos</span>
                <span class="nav-badge badge-accent-green" *ngIf="!isSidebarCollapsed() && pedidosCount() > 0">
                  {{ pedidosCount() }}
                </span>
              </button>
            </li>

            <!-- 4. Configuración -->
            <li class="nav-item">
              <button type="button" 
                      class="nav-link" 
                      [class.active]="activeTab() === 'configuracion'" 
                      (click)="setTab('configuracion')" 
                      title="Seguridad y configuración de cuenta">
                <fa-icon [icon]="faKey" class="nav-icon"></fa-icon>
                <span class="nav-label" *ngIf="!isSidebarCollapsed()">Configuración</span>
              </button>
            </li>

          </ul>
        </nav>

        <!-- Footer del Sidebar: Volver al Sitio Web & Cerrar Sesión -->
        <div class="sidebar-footer">
          <div class="sidebar-footer-actions">
            <a routerLink="/" class="nav-link btn-sidebar-site" (click)="closeMobileSidebar()" title="Volver al sitio web">
              <fa-icon [icon]="faStore" class="nav-icon"></fa-icon>
              <span class="nav-label" *ngIf="!isSidebarCollapsed()">Volver al sitio web</span>
            </a>

            <button type="button" class="nav-link btn-sidebar-logout" (click)="logout()" title="Cerrar sesión">
              <fa-icon [icon]="faSignOutAlt" class="nav-icon"></fa-icon>
              <span class="nav-label" *ngIf="!isSidebarCollapsed()">Cerrar Sesión</span>
            </button>
          </div>
        </div>

      </aside>

      <!-- Overlay para Móviles -->
      <div class="sidebar-backdrop" *ngIf="isMobileSidebarOpen()" (click)="closeMobileSidebar()"></div>

      <!-- ══════════════════════════════════════════════════════════════
           ÁREA DE CONTENIDO (HEADER STICKY 74px + CANVAS #f4f5f7)
           ══════════════════════════════════════════════════════════════ -->
      <div class="dash-content-area">
        
        <!-- HEADER STICKY (74px, Blanco Puro, Borde 1.5px) -->
        <header class="dash-header">
          <div class="header-left">
            <!-- Botón Hamburguesa Móvil -->
            <button type="button" class="mobile-hamburger-btn" (click)="toggleMobileSidebar()" aria-label="Abrir Menú">
              <fa-icon [icon]="isMobileSidebarOpen() ? faTimes : faBars"></fa-icon>
            </button>

            <!-- Título y Subtítulo Dinámicos -->
            <div class="header-title-box">
              <div class="title-with-status">
                <h1 class="header-title">{{ getHeaderTitle() }}</h1>
                <div class="status-pill">
                  <span class="status-dot"></span>
                  <span class="status-pill-text">Cuenta Activa</span>
                </div>
              </div>
              <p class="header-subtitle">{{ getHeaderSubtitle() }}</p>
            </div>
          </div>

          <div class="header-right">
            <!-- Enlace Volver al Sitio Web -->
            <a routerLink="/" class="header-action-pill" title="Volver a la tienda">
              <fa-icon [icon]="faStore" class="pill-icon"></fa-icon>
              <span class="pill-label">Volver al sitio web</span>
            </a>

            <!-- Perfil del Cliente -->
            <div class="header-user-profile">
              <div class="user-avatar-circle">
                <span>{{ getInitials() }}</span>
              </div>
              <div class="user-meta-text">
                <span class="user-name">{{ getFullName() }}</span>
                <span class="user-sub">Cliente Plaxtilineas</span>
              </div>
            </div>
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
        
        --sidebar-w: 240px;
        --sidebar-w-collapsed: 64px;
        --header-h: 74px;
        --nav-total-h: 110px;
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
        min-height: calc(100vh - var(--nav-total-h));
        padding-top: var(--nav-total-h);
        background: var(--dash-bg-canvas);
        position: relative;
        align-items: flex-start;
      }

      /* ══════════════════════════════════════════════════════════════
         SIDEBAR LATERAL IZQUIERDO (#0a0a0a)
         ══════════════════════════════════════════════════════════════ */
      .dash-sidebar {
        position: sticky;
        top: var(--header-h);
        align-self: flex-start;
        flex-shrink: 0;
        height: calc(100vh - var(--header-h));
        width: var(--sidebar-w);
        background: var(--dash-dark-surface);
        border-right: 1px solid var(--dash-dark-border);
        z-index: 150;
        display: flex;
        flex-direction: column;
        transition: width var(--transition);
        padding: 20px 14px;
      }

      .dash-shell.sidebar-collapsed .dash-sidebar {
        width: var(--sidebar-w-collapsed);
        padding: 20px 8px;
      }

      /* Botón Flotante para Colapsar el Sidebar */
      .sidebar-toggle {
        width: 28px;
        height: 28px;
        background: #18181b;
        border: 1.5px solid #2e2e33;
        border-radius: 50%;
        color: #e4e4e7;
        cursor: pointer;
        position: absolute;
        top: 22px;
        right: -14px;
        z-index: 200;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }

      .sidebar-toggle:hover {
        background: #27272a;
        color: #ffffff;
        transform: scale(1.15);
      }

      .toggle-icon {
        font-size: 11px;
      }

      /* Marca / Logo */
      .sidebar-brand {
        margin-bottom: 28px;
        padding: 0 4px;
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
        overflow: hidden;
        white-space: nowrap;
      }

      .brand-name {
        font-weight: 800;
        font-size: 1.05rem;
        letter-spacing: -0.02em;
        color: #ffffff;
      }

      .brand-role {
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: var(--dash-text-muted);
      }

      /* Navegación */
      .sidebar-nav {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nav-section-label {
        font-size: 0.64rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: #52525b;
        margin: 6px 10px 10px 10px;
        text-align: left;
      }

      .nav-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nav-item {
        position: relative;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 14px;
        border-radius: 12px;
        color: #a1a1aa;
        text-decoration: none;
        font-size: 0.88rem;
        font-weight: 600;
        transition: all 0.18s ease;
        white-space: nowrap;
        background: transparent;
        border: 1px solid transparent;
        width: 100%;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
      }

      .dash-shell.sidebar-collapsed .nav-link {
        justify-content: center;
        padding: 11px 0;
        gap: 0;
      }

      .nav-icon {
        font-size: 15px;
        color: #71717a;
        transition: color 0.18s ease;
        flex-shrink: 0;
        width: 18px;
        text-align: center;
      }

      .nav-link:hover {
        background: #141416;
        color: #ffffff;
      }

      .nav-link:hover .nav-icon {
        color: var(--dash-accent-green-light);
      }

      /* Estado Activo del Item */
      .nav-link.active {
        background: #18181b;
        color: #ffffff;
        border: 1px solid #27272a;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
      }

      .nav-link.active .nav-icon {
        color: var(--dash-accent-green-light);
      }

      /* Badge de Contador Verde (Reemplazo del Rojo) */
      .nav-badge {
        margin-left: auto;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 9999px;
      }

      .nav-badge.badge-accent-green {
        background: var(--dash-accent-green);
        color: #ffffff;
        box-shadow: 0 0 8px var(--dash-accent-green-glow);
      }

      /* Footer del Sidebar */
      .sidebar-footer {
        padding-top: 14px;
        border-top: 1px solid var(--dash-dark-border);
      }

      .sidebar-footer-actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .btn-sidebar-site {
        color: #e4e4e7;
        border: 1px solid transparent;
        transition: all 0.18s ease;
        text-decoration: none;
      }

      .btn-sidebar-site:hover {
        background: #18181b;
        color: #ffffff;
        border-color: #27272a;
      }

      .btn-sidebar-site .nav-icon {
        color: #a1a1aa;
      }

      .btn-sidebar-site:hover .nav-icon {
        color: var(--dash-accent-green-light);
      }

      .btn-sidebar-logout {
        width: 100%;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        color: #ef4444;
      }

      .btn-sidebar-logout .nav-icon {
        color: #ef4444;
      }

      .btn-sidebar-logout:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #f87171;
      }

      .btn-sidebar-logout:hover .nav-icon {
        color: #f87171;
      }

      /* ══════════════════════════════════════════════════════════════
         CONTENIDO PRINCIPAL (HEADER 74px + CANVAS #f4f5f7)
         ══════════════════════════════════════════════════════════════ */
      .dash-content-area {
        flex: 1;
        min-width: 0;
        min-height: calc(100vh - var(--nav-total-h));
        display: flex;
        flex-direction: column;
        transition: margin-left var(--transition), width var(--transition);
      }

      /* SUB-HEADER (74px, Blanco Puro, Borde 1.5px) */
      .dash-header {
        height: var(--header-h);
        background: #ffffff;
        border-bottom: 1.5px solid var(--dash-card-border);
        position: relative;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 32px;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .mobile-hamburger-btn {
        display: none;
        background: transparent;
        border: none;
        font-size: 20px;
        color: var(--dash-text-dark);
        cursor: pointer;
      }

      .header-title-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: left;
      }

      .title-with-status {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-title {
        font-size: 1.25rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--dash-text-dark);
        margin: 0;
      }

      /* Status Pill con Verde */
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #ecfdf5;
        border: 1px solid rgba(22, 163, 74, 0.2);
        padding: 2px 8px;
        border-radius: 9999px;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--dash-accent-green);
        box-shadow: 0 0 6px var(--dash-accent-green);
      }

      .status-pill-text {
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--dash-accent-green);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .header-subtitle {
        font-size: 0.78rem;
        color: var(--dash-text-muted);
        margin: 0;
      }

      /* Header Derecha */
      .header-right {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .header-action-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: #ffffff;
        border: 1px solid var(--dash-card-border);
        border-radius: 9999px;
        text-decoration: none;
        color: var(--dash-text-dark);
        font-size: 0.8rem;
        font-weight: 700;
        transition: all 0.18s ease;
      }

      .header-action-pill:hover {
        background: #f4f4f5;
        border-color: #27272a;
      }

      .pill-icon {
        color: var(--dash-accent-green);
        font-size: 14px;
      }

      .header-user-profile {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 10px 4px 6px;
        background: #fafafa;
        border: 1px solid var(--dash-card-border);
        border-radius: 9999px;
      }

      .user-avatar-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #09090b;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 0 0 2px var(--dash-accent-green);
      }

      .user-meta-text {
        display: flex;
        flex-direction: column;
        text-align: left;
        line-height: 1.15;
      }

      .user-name {
        font-size: 0.82rem;
        font-weight: 800;
        color: var(--dash-text-dark);
      }

      .user-sub {
        font-size: 0.65rem;
        color: var(--dash-text-muted);
        font-weight: 600;
      }

      /* ══════════════════════════════════════════════════════════════
         CANVAS INTERNO (#f4f5f7) & TARJETAS
         ══════════════════════════════════════════════════════════════ */
      .dash-canvas {
        padding: 28px 32px 64px;
        flex: 1;
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
        .dash-shell {
          padding-top: var(--nav-total-h);
        }

        .dash-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          height: auto;
          padding-top: calc(var(--nav-total-h) + 20px);
          z-index: 1050;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
        }

        .dash-sidebar.mobile-open {
          transform: translateX(0);
        }

        .sidebar-toggle {
          display: none;
        }

        .dash-content-area {
          margin-left: 0 !important;
          width: 100% !important;
        }

        .mobile-hamburger-btn {
          display: block;
        }

        .dash-header {
          padding: 0 16px;
        }

        .dash-canvas {
          padding: 20px 16px;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .header-action-pill {
          display: none;
        }

        .sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1040;
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
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faHome = faHome;
  faStore = faStore;
  faShieldAlt = faShieldAlt;
  faCheckCircle = faCheckCircle;
  faBars = faBars;
  faTimes = faTimes;

  // Estados del Sidebar
  isSidebarCollapsed = signal<boolean>(false);
  isMobileSidebarOpen = signal<boolean>(false);

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

  toggleSidebarCollapse() {
    this.isSidebarCollapsed.set(!this.isSidebarCollapsed());
  }

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.set(!this.isMobileSidebarOpen());
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }

  setTab(tab: ProfileTab) {
    this.activeTab.set(tab);
    this.closeMobileSidebar();
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
