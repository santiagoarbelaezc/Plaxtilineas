import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faMapMarkerAlt, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FontAwesomeModule],
  template: `
    <app-navbar></app-navbar>

    <div class="profile-page">
      <div class="profile-container">
        
        <!-- Header -->
        <header class="profile-header">
          <h1 class="profile-title">Mi Cuenta</h1>
          <p class="profile-subtitle">Gestiona tu información personal y libreta de direcciones de envío</p>
        </header>

        <!-- Layout de Columnas -->
        <div class="profile-layout">
          
          <!-- Columna Izquierda: Tarjeta de Resumen -->
          <aside class="profile-sidebar fade-in">
            <div class="user-avatar-card">
              <div class="avatar-circle">
                <span>{{ getInitials() }}</span>
              </div>
              <h2 class="user-fullname">{{ getFullName() }}</h2>
              <span class="user-role-badge">{{ getRole() }}</span>
              <span class="user-email-text">{{ getEmail() }}</span>
            </div>

            <nav class="sidebar-nav">
              <button class="sidebar-nav-btn" [class.active]="activeTab() === 'personal'" (click)="activeTab.set('personal')">
                <fa-icon [icon]="faUser" class="nav-icon"></fa-icon> Datos Personales
              </button>
              <button class="sidebar-nav-btn" [class.active]="activeTab() === 'direccion'" (click)="activeTab.set('direccion')">
                <fa-icon [icon]="faMapMarkerAlt" class="nav-icon"></fa-icon> Dirección de Envío
              </button>
              <button class="sidebar-nav-btn danger-btn" (click)="logout()">
                <fa-icon [icon]="faSignOutAlt" class="nav-icon"></fa-icon> Cerrar Sesión
              </button>
            </nav>
          </aside>

          <!-- Columna Derecha: Formularios de Edición -->
          <main class="profile-main-content fade-in">
            
            <form #profileForm="ngForm" (ngSubmit)="guardarCambios()" class="form-card">
              
              <!-- Pestaña 1: Datos Personales -->
              @if (activeTab() === 'personal') {
                <div class="tab-content fade-in">
                  <h3 class="tab-title">Información de Contacto</h3>
                  
                  <div class="form-grid">
                    <div class="field">
                      <label for="nombre">Nombre *</label>
                      <input id="nombre" type="text" [(ngModel)]="form.nombre" name="nombre" required minlength="2" placeholder="Ingresa tu nombre">
                    </div>

                    <div class="field">
                      <label for="apellidos">Apellidos *</label>
                      <input id="apellidos" type="text" [(ngModel)]="form.apellidos" name="apellidos" required minlength="2" placeholder="Ingresa tus apellidos">
                    </div>

                    <div class="field">
                      <label for="telefono">Teléfono de contacto *</label>
                      <input id="telefono" type="tel" [(ngModel)]="form.telefono" name="telefono" required pattern="[0-9]{7,15}" placeholder="Ej: 3001234567">
                      <span class="field-hint">Solo números, entre 7 y 15 dígitos.</span>
                    </div>

                    <div class="field">
                      <label for="edad">Edad *</label>
                      <input id="edad" type="number" [(ngModel)]="form.edad" name="edad" required min="0" max="120" placeholder="Ingresa tu edad">
                    </div>
                  </div>
                </div>
              }

              <!-- Pestaña 2: Dirección de Envío -->
              @if (activeTab() === 'direccion') {
                <div class="tab-content fade-in">
                  <h3 class="tab-title">Libreta de Direcciones</h3>
                  
                  <div class="form-grid">
                    <div class="field full-width">
                      <label for="direccion">Dirección completa *</label>
                      <input id="direccion" type="text" [(ngModel)]="form.direccion" name="direccion" required minlength="5" placeholder="Ej: Calle 37 N #20-85 Inter Plaza">
                    </div>

                    <div class="field">
                      <label for="departamento">Departamento *</label>
                      <select id="departamento" [(ngModel)]="form.departamento" name="departamento" required (change)="onDepartamentoChange()">
                        <option value="">Selecciona un departamento</option>
                        @for (dept of departamentosList; track dept) {
                          <option [value]="dept">{{ dept }}</option>
                        }
                      </select>
                    </div>

                    <div class="field">
                      <label for="ciudad">Ciudad *</label>
                      <select id="ciudad" [(ngModel)]="form.ciudad" name="ciudad" required [disabled]="!form.departamento">
                        <option value="">Selecciona una ciudad</option>
                        @for (ciudad of ciudadesDisponibles; track ciudad) {
                          <option [value]="ciudad">{{ ciudad }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>
              }

              <!-- Footer de la Tarjeta con Botón de Guardado -->
              <div class="form-actions">
                <button type="submit" class="btn-submit" [disabled]="profileForm.invalid || isSaving() || !hasChanges()">
                  @if (isSaving()) {
                    <span class="spinner"></span> Guardando...
                  } @else {
                    Guardar Cambios
                  }
                </button>
              </div>

            </form>
          </main>

        </div>

      </div>
    </div>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');

      * { box-sizing: border-box; }

      .profile-page {
        min-height: 100vh;
        background: var(--dash-bg-main, #0f1420);
        font-family: var(--font-primary, 'Montserrat', sans-serif);
        padding-top: 150px;
        padding-bottom: 80px;
        color: var(--dash-text-main, #f8fafc);
      }

      .profile-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px;
      }

      .profile-header {
        margin-bottom: 32px;
        text-align: left;
      }

      .profile-title {
        font-size: 28px;
        font-weight: 800;
        color: var(--dash-text-main, #fff);
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
      }

      .profile-subtitle {
        color: var(--dash-text-muted, #94a3b8);
        font-size: 14px;
        margin: 0;
      }

      /* LAYOUT */
      .profile-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 32px;
      }

      @media (min-width: 768px) {
        .profile-layout {
          grid-template-columns: 280px 1fr;
        }
      }

      /* SIDEBAR CARD */
      .profile-sidebar {
        background: var(--dash-bg-card, #1e293b);
        border: 1px solid var(--dash-border, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 24px;
        height: fit-content;
      }

      .user-avatar-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 24px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--dash-border, rgba(255, 255, 255, 0.05));
      }

      .avatar-circle {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #368c44, #25d366);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 16px;
        box-shadow: 0 8px 24px rgba(54, 140, 68, 0.25);
      }

      .user-fullname {
        font-size: 16px;
        font-weight: 700;
        color: var(--dash-text-main, #fff);
        margin: 0 0 6px 0;
      }

      .user-role-badge {
        font-size: 11px;
        font-weight: 700;
        color: var(--dash-text-accent, #4ade80);
        background: rgba(54, 140, 68, 0.12);
        padding: 4px 10px;
        border-radius: 20px;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .user-email-text {
        font-size: 12px;
        color: var(--dash-text-muted, #94a3b8);
        word-break: break-all;
      }

      /* SIDEBAR NAVIGATION */
      .sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .sidebar-nav-btn {
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        color: var(--dash-text-muted, #94a3b8);
        font-size: 14px;
        font-weight: 600;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s;
        font-family: inherit;
      }

      .sidebar-nav-btn:hover {
        background: var(--dash-bg-hover, rgba(255, 255, 255, 0.04));
        color: var(--dash-text-main, #fff);
      }

      .sidebar-nav-btn.active {
        background: rgba(54, 140, 68, 0.15);
        color: var(--dash-text-accent, #4ade80);
      }

      .danger-btn {
        margin-top: 16px;
        color: #ef4444;
      }

      .danger-btn:hover {
        background: rgba(239, 68, 68, 0.08);
        color: #f87171;
      }

      /* MAIN FORM CARD */
      .form-card {
        background: var(--dash-bg-card, #1e293b);
        border: 1px solid var(--dash-border, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 32px;
        display: flex;
        flex-direction: column;
        min-height: 380px;
      }

      .tab-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--dash-text-main, #fff);
        margin: 0 0 24px 0;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      @media (max-width: 600px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: left;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--dash-text-muted, #94a3b8);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      input, select {
        background: var(--dash-bg-input, rgba(15, 20, 32, 0.6));
        border: 1px solid var(--dash-border, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 12px 14px;
        color: var(--dash-text-main, #e2e8f0);
        font-size: 14px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
        width: 100%;
      }

      select {
        background-color: var(--dash-bg-input, #1e293b);
        cursor: pointer;
      }

      input:focus, select:focus {
        border-color: var(--dash-text-accent, #368c44);
      }

      .field-hint {
        font-size: 11px;
        color: var(--dash-text-muted, #64748b);
        margin-top: 2px;
      }

      /* ACTIONS */
      .form-actions {
        margin-top: auto;
        padding-top: 32px;
        border-top: 1px solid var(--dash-border, rgba(255, 255, 255, 0.07));
        display: flex;
        justify-content: flex-end;
      }

      .btn-submit {
        background: var(--dash-text-accent, #368c44);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        padding: 14px 28px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .btn-submit:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(54, 140, 68, 0.35);
        background: #25d366;
      }

      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* SPINNER */
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.75s linear infinite;
        display: inline-block;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* FADE IN */
      .fade-in {
        animation: fadeIn 0.35s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }
    </style>
  `
})
export class PerfilComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  faUser = faUser;
  faMapMarkerAlt = faMapMarkerAlt;
  faSignOutAlt = faSignOutAlt;

  activeTab = signal<'personal' | 'direccion'>('personal');
  isSaving = signal(false);

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
    // Escuchar cambios de perfil del usuario actual
    const user = this.authService.currentUser.getValue();
    if (user) {
      this.cargarDatosUsuario(user);
    } else {
      // Re-verificar token si por alguna razón no se ha cargado el BehaviorSubject
      this.authService.checkToken();
      this.authService.currentUser.subscribe(u => {
        if (u) {
          this.cargarDatosUsuario(u);
        }
      });
    }
  }

  cargarDatosUsuario(user: any) {
    this.form.nombre = user.nombre || '';
    this.form.apellidos = user.apellidos || '';
    this.form.telefono = user.telefono || '';
    this.form.edad = user.edad || 0;
    this.form.direccion = user.direccion || '';

    // Manejar el mapeo de Ciudad y Departamento guardados en formato "Ciudad, Departamento"
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

    // Copiar al estado inicial para detectar cambios
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

  getRole(): string {
    return this.authService.currentUser.getValue()?.rol || 'Cliente';
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
      confirmButtonColor: '#368c44',
      cancelButtonColor: '#64748b',
      background: '#1e293b',
      color: '#e2e8f0'
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
      next: (res) => {
        this.isSaving.set(false);
        this.initialForm = { ...this.form }; // Sincronizar el estado inicial tras guardar
        Swal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Tus datos personales han sido actualizados con éxito.',
          background: '#1e293b',
          color: '#e2e8f0',
          confirmButtonColor: '#368c44'
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.error || 'No se pudo actualizar tu perfil. Intenta de nuevo.';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          background: '#1e293b',
          color: '#e2e8f0',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }
}
