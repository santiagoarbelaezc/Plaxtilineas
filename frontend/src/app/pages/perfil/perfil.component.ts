import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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
import { Subject, takeUntil } from 'rxjs';

export type ProfileTab = 'datos' | 'direccion' | 'pedidos' | 'configuracion';

interface PerfilModalState {
  type: 'success' | 'error' | 'logout';
  title: string;
  message: string;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MisPedidos,
    ConfiguracionComponent,
    FontAwesomeModule
  ],
  styleUrls: ['./perfil.component.css'],
  template: `
    <div class="perfil-wrapper">

      <!-- MODAL NATIVO PLAXTILINEAS (Éxito / Error / Confirmar Cierre de Sesión) -->
      <div class="perfil-modal-overlay" *ngIf="feedbackModal() as modal" (click)="closeModal()" role="dialog" aria-modal="true">
        <div class="perfil-modal-card" (click)="$event.stopPropagation()">
          <div class="perfil-modal-accent" [class.is-error]="modal.type === 'error'"></div>

          <!-- Ícono animado según tipo -->
          <div class="perfil-modal-icon-ring" [class.is-error]="modal.type === 'error'" [class.is-logout]="modal.type === 'logout'">
            <svg *ngIf="modal.type === 'success'" class="modal-check-svg" viewBox="0 0 52 52" aria-hidden="true">
              <circle class="modal-check-circle" cx="26" cy="26" r="23" fill="none" />
              <path class="modal-check-path" fill="none" d="M15.5 26.8l6.8 6.9 14.4-14.8" />
            </svg>
            <svg *ngIf="modal.type === 'error'" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <svg *ngIf="modal.type === 'logout'" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>

          <h2 class="perfil-modal-title">{{ modal.title }}</h2>
          <p class="perfil-modal-desc">{{ modal.message }}</p>

          <div class="perfil-modal-actions" *ngIf="modal.type !== 'logout'">
            <button type="button" class="perfil-modal-btn-primary" (click)="closeModal()">
              Entendido
            </button>
          </div>

          <div class="perfil-modal-actions" *ngIf="modal.type === 'logout'">
            <button type="button" class="perfil-modal-btn-secondary" (click)="closeModal()">
              Cancelar
            </button>
            <button type="button" class="perfil-modal-btn-primary" (click)="confirmLogout()">
              Sí, salir
            </button>
          </div>
        </div>
      </div>

      <!-- LAYOUT SPLIT-SCREEN (62% BLANCO IZQUIERDA · 38% VERDE PLAXTILINEAS DERECHA) -->
      <div class="perfil-grid">

        <!-- COLUMNA IZQUIERDA (BLANCO PURO #ffffff): FORMULARIOS Y CONTENIDO -->
        <main class="perfil-main-col">
          <div class="perfil-flow-container">

            <!-- Top Bar: Botón Volver + Kicker -->
            <div class="perfil-top-bar">
              <button type="button" class="btn-volver-izq" (click)="volverAtras()">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Volver</span>
              </button>
              <span class="perfil-kicker">Mi Cuenta Plaxtilineas</span>
            </div>

            <!-- Cabecera Editorial -->
            <div class="perfil-header">
              <h1 class="perfil-title">{{ getHeaderTitle() }}</h1>
              <p class="perfil-subtitle">{{ getHeaderSubtitle() }}</p>
            </div>

            <!-- 1. Datos Personales y Dirección (Unificados) -->
            <section *ngIf="activeTab() === 'datos'" class="perfil-pane">
              <form #profileForm="ngForm" (ngSubmit)="guardarCambios()" class="dash-form">
                <div class="form-section-heading">Información personal</div>
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
                    <label for="tipo_documento">Tipo de identificación</label>
                    <select id="tipo_documento" [(ngModel)]="form.tipo_documento" name="tipo_documento" class="form-select">
                      <option value="CC">C.C. (Cédula de Ciudadanía)</option>
                      <option value="NIT">NIT (Empresa / Persona Jurídica)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="numero_documento">
                      {{ form.tipo_documento === 'NIT' ? 'Número de NIT' : 'Número de Cédula (C.C.)' }}
                    </label>
                    <input
                      id="numero_documento"
                      type="text"
                      [(ngModel)]="form.numero_documento"
                      name="numero_documento"
                      pattern="[0-9]{5,15}(-[0-9])?"
                      [placeholder]="form.tipo_documento === 'NIT' ? 'Ej: 900123456-7' : 'Ej: 1094912345'"
                      class="form-input">
                    <span class="field-hint">5 a 15 dígitos (en NIT puedes incluir dígito de verificación, ej. 900123456-7).</span>
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

                <div class="form-section-divider"></div>
                <div class="form-section-heading">Dirección de entrega</div>

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
                    <label for="ciudad">Ciudad / Municipio <span class="required">*</span></label>
                    <select id="ciudad" [(ngModel)]="form.ciudad" name="ciudad" required [disabled]="!form.departamento" class="form-select">
                      <option value="">Selecciona ciudad o municipio</option>
                      <option *ngFor="let ciudad of ciudadesDisponibles" [value]="ciudad">{{ ciudad }}</option>
                    </select>
                  </div>
                </div>

                <div class="form-actions-row">
                  <button type="submit" class="btn-dash-primary" [disabled]="profileForm.invalid || isSaving() || !hasChanges()">
                    <span *ngIf="isSaving()" class="spinner"></span>
                    <span>{{ isSaving() ? 'Guardando...' : 'Guardar Cambios' }}</span>
                  </button>
                </div>
              </form>
            </section>

            <!-- 2. Mis Pedidos -->
            <section *ngIf="activeTab() === 'pedidos'" class="perfil-pane embedded-section-box">
              <app-mis-pedidos [isEmbedded]="true"></app-mis-pedidos>
            </section>

            <!-- 4. Seguridad y Cuenta -->
            <section *ngIf="activeTab() === 'configuracion'" class="perfil-pane embedded-section-box">
              <app-configuracion [isEmbedded]="true"></app-configuracion>
            </section>

          </div>
        </main>

        <!-- COLUMNA DERECHA (FIJA SIN SCROLL): FRANJA DEGRADADO VERDE → CARBÓN + ISOTIPO -->
        <aside class="perfil-brand-col">
          <img
            src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1795130400/logo-solo_r6tfo7.png"
            alt=""
            aria-hidden="true"
            class="perfil-isotipo-watermark" />

          <!-- Logo + Volver a la tienda -->
          <div class="brand-top-row">
            <a routerLink="/" class="brand-logo-link" aria-label="Plaxtilineas Inicio">
              <img
                src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png"
                alt="Plaxtilineas"
                class="brand-logo-img" />
            </a>
            <a routerLink="/" class="brand-store-btn" title="Ir a la tienda">
              <fa-icon [icon]="faStore"></fa-icon>
              <span>Tienda</span>
            </a>
          </div>

          <!-- Resumen del Cliente -->
          <div class="brand-user-hero">
            <div class="brand-avatar-row">
              <div class="brand-avatar-circle">{{ getInitials() }}</div>
              <div class="brand-user-info">
                <h2 class="brand-user-name">{{ getFullName() }}</h2>
                <p class="brand-user-email">{{ getEmail() || 'Cliente Plaxtilineas' }}</p>
              </div>
            </div>

            <div class="brand-user-summary-pills">
              <span class="summary-pill" *ngIf="form.ciudad || form.departamento">
                <fa-icon [icon]="faMapMarkerAlt"></fa-icon>
                <span>{{ form.ciudad || 'Armenia' }}{{ form.departamento ? ', ' + form.departamento : '' }}</span>
              </span>
              <span class="summary-pill" *ngIf="pedidosCount() > 0">
                <fa-icon [icon]="faShoppingBag"></fa-icon>
                <span>{{ pedidosCount() }} {{ pedidosCount() === 1 ? 'pedido' : 'pedidos' }}</span>
              </span>
            </div>
          </div>

          <!-- Accesos Rápidos de Navegación -->
          <div class="brand-quick-nav">
            <button type="button" class="brand-nav-item" [class.active]="activeTab() === 'datos'" (click)="setTab('datos')">
              <span class="brand-nav-left">
                <fa-icon [icon]="faUser"></fa-icon>
                <span>Datos personales y entrega</span>
              </span>
              <span>→</span>
            </button>

            <button type="button" class="brand-nav-item" [class.active]="activeTab() === 'pedidos'" (click)="setTab('pedidos')">
              <span class="brand-nav-left">
                <fa-icon [icon]="faShoppingBag"></fa-icon>
                <span>Mis pedidos</span>
              </span>
              <span class="brand-nav-count" *ngIf="pedidosCount() > 0">{{ pedidosCount() }}</span>
              <span *ngIf="pedidosCount() === 0">→</span>
            </button>

            <button type="button" class="brand-nav-item" [class.active]="activeTab() === 'configuracion'" (click)="setTab('configuracion')">
              <span class="brand-nav-left">
                <fa-icon [icon]="faKey"></fa-icon>
                <span>Seguridad y cuenta</span>
              </span>
              <span>→</span>
            </button>
          </div>

          <!-- Cerrar Sesión + Ubicación -->
          <div class="brand-footer-block">
            <button type="button" class="brand-logout-btn" (click)="logout()">
              <fa-icon [icon]="faSignOutAlt"></fa-icon>
              <span>Cerrar Sesión</span>
            </button>

            <div class="brand-location-foot">
              <span class="location-dot"></span>
              <span>Armenia &bull; Eje Cafetero</span>
            </div>
          </div>
        </aside>

      </div>
    </div>
  `
})
export class PerfilComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private pedidoService = inject(PedidoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
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
  feedbackModal = signal<PerfilModalState | null>(null);

  form = {
    nombre: '',
    apellidos: '',
    tipo_documento: 'CC',
    numero_documento: '',
    telefono: '',
    edad: 0,
    direccion: '',
    departamento: '',
    ciudad: ''
  };

  initialForm = {
    nombre: '',
    apellidos: '',
    tipo_documento: 'CC',
    numero_documento: '',
    telefono: '',
    edad: 0,
    direccion: '',
    departamento: '',
    ciudad: ''
  };

  departamentos: { [key: string]: string[] } = {
    "Amazonas": ["Leticia", "Puerto Nariño"],
    "Antioquia": ["Bello", "Envigado", "Itagüí", "Medellín", "Rionegro"],
    "Arauca": ["Arauca", "Saravena", "Tame"],
    "Atlántico": ["Barranquilla", "Malambo", "Puerto Colombia", "Soledad"],
    "Bogotá D.C.": ["Bogotá"],
    "Bolívar": ["Arjona", "Cartagena", "Magangué", "Turbaco"],
    "Boyacá": ["Chiquinquirá", "Duitama", "Sogamoso", "Tunja"],
    "Caldas": ["Chinchiná", "La Dorada", "Manizales", "Villamaría"],
    "Caquetá": ["El Doncello", "Florencia", "San Vicente del Caguán"],
    "Casanare": ["Aguazul", "Villanueva", "Yopal"],
    "Cauca": ["Popayán", "Puerto Tejada", "Santander de Quilichao"],
    "Cesar": ["Aguachica", "Bosconia", "Valledupar"],
    "Chocó": ["Condoto", "Istmina", "Quibdó"],
    "Córdoba": ["Cereté", "Lorica", "Montería", "Sahagún"],
    "Cundinamarca": ["Chía", "Facatativá", "Fusagasugá", "Soacha", "Zipaquirá"],
    "Guainía": ["Inírida"],
    "Guaviare": ["Calamar", "San José del Guaviare"],
    "Huila": ["Garzón", "La Plata", "Neiva", "Pitalito"],
    "La Guajira": ["Fonseca", "Maicao", "Riohacha", "Uribia"],
    "Magdalena": ["Ciénaga", "Fundación", "Santa Marta"],
    "Meta": ["Acacías", "Granada", "Puerto López", "Villavicencio"],
    "Nariño": ["Ipiales", "Pasto", "Tumaco", "Túquerres"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario"],
    "Putumayo": ["Mocoa", "Orito", "Puerto Asís"],
    "Quindío": ["Armenia", "Calarcá", "Circasia", "Filandia", "La Tebaida", "Montenegro", "Pueblo Tapao", "Salento"],
    "Risaralda": ["Dosquebradas", "Pereira", "Santa Rosa de Cabal"],
    "San Andrés y Providencia": ["Providencia", "San Andrés"],
    "Santander": ["Barrancabermeja", "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"],
    "Sucre": ["Corozal", "San Marcos", "Sincelejo"],
    "Tolima": ["Espinal", "Honda", "Ibagué", "Melgar"],
    "Valle del Cauca": ["Buenaventura", "Buga", "Cali", "Cartago", "Palmira", "Tuluá"],
    "Vaupés": ["Mitú"],
    "Vichada": ["La Primavera", "Puerto Carreño"]
  };

  departamentosList: string[] = Object.keys(this.departamentos).sort((a, b) => a.localeCompare(b, 'es'));
  ciudadesDisponibles: string[] = [];

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam === 'direccion') {
        this.activeTab.set('datos');
      } else if (tabParam && ['datos', 'pedidos', 'configuracion'].includes(tabParam)) {
        this.activeTab.set(tabParam as ProfileTab);
      }
    });

    const user = this.authService.currentUser.getValue();
    if (user) {
      this.cargarDatosUsuario(user);
    }

    // Siempre sincronizar con GET /api/auth/perfil al entrar a /perfil para garantizar
    // que apellidos, edad, dirección y ciudad estén 100% completos y frescos desde la BD
    this.authService.obtenerPerfil().pipe(takeUntil(this.destroy$)).subscribe({
      next: (freshUser) => {
        if (freshUser && !this.hasChanges()) {
          this.cargarDatosUsuario(freshUser);
        }
      },
      error: () => {}
    });

    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(u => {
      if (u && !this.hasChanges()) {
        this.cargarDatosUsuario(u);
      }
    });

    this.cargarConteoPedidos();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  volverAtras(): void {
    this.router.navigate(['/']);
  }

  cargarConteoPedidos() {
    this.pedidoService.obtenerMisPedidos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const list = data?.pedidos || [];
        this.pedidosCount.set(list.length);
      },
      error: () => {}
    });
  }

  setTab(tab: ProfileTab) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  getHeaderTitle(): string {
    switch (this.activeTab()) {
      case 'datos': return 'Datos Personales y Entrega';
      case 'pedidos': return 'Mis Pedidos';
      case 'configuracion': return 'Seguridad y Cuenta';
      default: return 'Mi Cuenta';
    }
  }

  getHeaderSubtitle(): string {
    switch (this.activeTab()) {
      case 'datos': return 'Actualiza tu información de contacto y tu dirección principal de envío.';
      case 'pedidos': return 'Consulta, rastrea y descarga los comprobantes de tus pedidos.';
      case 'configuracion': return 'Gestiona la seguridad, contraseña y estado de tu cuenta.';
      default: return 'Portal del Cliente Plaxtilineas';
    }
  }

  cargarDatosUsuario(user: any) {
    this.form.nombre = user.nombre || '';
    this.form.apellidos = user.apellidos || '';
    this.form.tipo_documento = user.tipo_documento || 'CC';
    this.form.numero_documento = user.numero_documento || '';
    this.form.telefono = user.telefono || '';
    this.form.edad = user.edad ?? 0;
    this.form.direccion = user.direccion || '';

    if (user.ciudad) {
      const parts = String(user.ciudad).split(',');
      if (parts.length > 1) {
        const deptRaw = parts[1].trim();
        const matchedDept = this.findDepartmentName(deptRaw) || deptRaw;
        this.form.departamento = matchedDept;
        this.ciudadesDisponibles = [...(this.departamentos[this.form.departamento] || [])].sort((a, b) => a.localeCompare(b, 'es'));
        this.form.ciudad = parts[0].trim();
      } else {
        const cityOnly = String(user.ciudad).trim();
        const inferredDept = this.inferDepartmentByCity(cityOnly);
        if (inferredDept) {
          this.form.departamento = inferredDept;
          this.ciudadesDisponibles = [...(this.departamentos[inferredDept] || [])].sort((a, b) => a.localeCompare(b, 'es'));
        }
        this.form.ciudad = cityOnly;
      }
    }

    this.initialForm = { ...this.form };
  }

  private normalizeText(val: string): string {
    return val.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private findDepartmentName(deptInput: string): string | null {
    const target = this.normalizeText(deptInput);
    for (const dept of Object.keys(this.departamentos)) {
      if (this.normalizeText(dept) === target) {
        return dept;
      }
    }
    return null;
  }

  private inferDepartmentByCity(cityInput: string): string | null {
    const target = this.normalizeText(cityInput);
    for (const [dept, cities] of Object.entries(this.departamentos)) {
      if (cities.some((c) => this.normalizeText(c) === target)) {
        return dept;
      }
    }
    return null;
  }

  hasChanges(): boolean {
    return (
      this.form.nombre !== this.initialForm.nombre ||
      this.form.apellidos !== this.initialForm.apellidos ||
      this.form.tipo_documento !== this.initialForm.tipo_documento ||
      this.form.numero_documento !== this.initialForm.numero_documento ||
      this.form.telefono !== this.initialForm.telefono ||
      Number(this.form.edad) !== Number(this.initialForm.edad) ||
      this.form.direccion !== this.initialForm.direccion ||
      this.form.departamento !== this.initialForm.departamento ||
      this.form.ciudad !== this.initialForm.ciudad
    );
  }

  onDepartamentoChange() {
    this.ciudadesDisponibles = this.form.departamento
      ? [...(this.departamentos[this.form.departamento] || [])].sort((a, b) => a.localeCompare(b, 'es'))
      : [];
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

  closeModal(): void {
    this.feedbackModal.set(null);
  }

  logout(): void {
    this.feedbackModal.set({
      type: 'logout',
      title: '¿Cerrar sesión?',
      message: '¿Estás seguro de que deseas salir de tu cuenta en este dispositivo?'
    });
  }

  confirmLogout(): void {
    this.closeModal();
    this.authService.logout(true);
  }

  guardarCambios() {
    if (this.isSaving()) return;

    this.isSaving.set(true);

    const fullCiudad = this.form.departamento
      ? `${this.form.ciudad}, ${this.form.departamento}`
      : this.form.ciudad;

    const payload = {
      nombre: this.form.nombre,
      apellidos: this.form.apellidos,
      tipo_documento: this.form.tipo_documento || undefined,
      numero_documento: this.form.numero_documento?.trim() || undefined,
      telefono: this.form.telefono,
      edad: this.form.edad,
      direccion: this.form.direccion,
      ciudad: fullCiudad
    };

    this.authService.actualizarPerfil(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.initialForm = { ...this.form };
        this.feedbackModal.set({
          type: 'success',
          title: '¡Datos actualizados!',
          message: 'Tu información se guardó correctamente en tu cuenta de Plaxtilineas.'
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.error || 'No se pudo actualizar tu perfil. Intenta de nuevo.';
        this.feedbackModal.set({
          type: 'error',
          title: 'No se pudo guardar',
          message: msg
        });
      }
    });
  }
}
