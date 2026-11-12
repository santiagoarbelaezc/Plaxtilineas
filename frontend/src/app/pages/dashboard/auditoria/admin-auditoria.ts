import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUserShield,
  faClock,
  faClipboardList,
  faTrash,
  faSync,
  faSearch,
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
  faEye,
  faCheckCircle,
  faExclamationTriangle,
  faUsers,
  faShoppingBag,
  faComments,
  faSignInAlt,
  faSignOutAlt,
  faCog,
  faLayerGroup,
  faFilter,
  faTimes,
  faHistory
} from '@fortawesome/free-solid-svg-icons';
import {
  AdminAuditoriaService,
  AuditoriaLogItem,
  AuditoriaEstadisticas,
  AdminSesionItem,
  AuditoriaPaginacion
} from '../../../services/admin-auditoria.service';

@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './admin-auditoria.html',
  styleUrls: ['./admin-auditoria.css']
})
export class AdminAuditoria implements OnInit, OnDestroy {
  private auditoriaService = inject(AdminAuditoriaService);
  private timerInterval: any;

  // Iconos FontAwesome
  faUserShield = faUserShield;
  faClock = faClock;
  faClipboardList = faClipboardList;
  faTrash = faTrash;
  faSync = faSync;
  faSearch = faSearch;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faEye = faEye;
  faCheckCircle = faCheckCircle;
  faExclamationTriangle = faExclamationTriangle;
  faUsers = faUsers;
  faShoppingBag = faShoppingBag;
  faComments = faComments;
  faSignInAlt = faSignInAlt;
  faSignOutAlt = faSignOutAlt;
  faCog = faCog;
  faLayerGroup = faLayerGroup;
  faFilter = faFilter;
  faTimes = faTimes;
  faHistory = faHistory;

  // Estado principal
  vistaActiva = signal<'operaciones' | 'sesiones'>('operaciones');
  loading = signal<boolean>(true);
  loadingSesiones = signal<boolean>(false);

  logs = signal<AuditoriaLogItem[]>([]);
  sesiones = signal<AdminSesionItem[]>([]);
  estadisticas = signal<AuditoriaEstadisticas>({
    total_operaciones: 0,
    operaciones_hoy: 0,
    total_sesiones: 0,
    sesiones_activas: 0,
    eliminaciones_totales: 0,
    respuestas_pqr: 0,
    gestiones_pedidos: 0,
    tiempo_total_segundos: 0,
    tiempo_total_formateado: '0s',
    tiempo_promedio_segundos: 0,
    tiempo_promedio_formateado: '0s',
    por_modulo: {},
    sesion_actual: null
  });

  paginacion = signal<AuditoriaPaginacion>({
    total: 0,
    pagina_actual: 1,
    total_paginas: 1,
    por_pagina: 20
  });

  // Cronómetro en vivo de la sesión actual
  segundosSesionEnVivo = signal<number>(0);

  cronometroFormateado = computed(() => {
    return this.formatearSegundos(this.segundosSesionEnVivo());
  });

  // Filtros
  filtroModulo = signal<string>('TODOS');
  filtroAccion = signal<string>('TODAS');
  filtroSesionId = signal<number | null>(null);
  filtroFechaInicio = signal<string>('');
  filtroFechaFin = signal<string>('');
  searchTerm = signal<string>('');
  paginaActual = signal<number>(1);

  // Filas expandidas
  expandedLogId = signal<number | null>(null);
  expandedSesionId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarTodo();
    this.iniciarCronometroEnVivo();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private iniciarCronometroEnVivo(): void {
    this.timerInterval = setInterval(() => {
      const actual = this.estadisticas().sesion_actual;
      if (actual && actual.activa) {
        this.segundosSesionEnVivo.update(s => s + 1);
      }
    }, 1000);
  }

  cargarTodo(): void {
    this.cargarAuditoria();
  }

  cargarAuditoria(): void {
    this.loading.set(true);
    this.auditoriaService.obtenerAuditoria({
      modulo: this.filtroModulo(),
      accion: this.filtroAccion(),
      sesion_id: this.filtroSesionId(),
      fecha_inicio: this.filtroFechaInicio(),
      fecha_fin: this.filtroFechaFin(),
      q: this.searchTerm(),
      page: this.paginaActual(),
      limit: 20
    }).subscribe({
      next: (res) => {
        this.logs.set(res.logs || []);
        if (res.sesiones) {
          this.sesiones.set(res.sesiones);
        }
        if (res.estadisticas) {
          this.estadisticas.set(res.estadisticas);
          if (res.estadisticas.sesion_actual) {
            this.segundosSesionEnVivo.set(res.estadisticas.sesion_actual.duracion_segundos || 0);
          }
        }
        if (res.paginacion) {
          this.paginacion.set(res.paginacion);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  cargarSesiones(): void {
    this.loadingSesiones.set(true);
    this.auditoriaService.obtenerSesiones(30).subscribe({
      next: (res) => {
        this.sesiones.set(res.sesiones || []);
        this.loadingSesiones.set(false);
      },
      error: () => {
        this.loadingSesiones.set(false);
      }
    });
  }

  cambiarVista(vista: 'operaciones' | 'sesiones'): void {
    this.vistaActiva.set(vista);
    if (vista === 'sesiones') {
      this.cargarSesiones();
    } else {
      this.cargarAuditoria();
    }
  }

  filtrarPorModulo(modulo: string): void {
    this.filtroModulo.set(modulo);
    this.filtroAccion.set('TODAS');
    this.paginaActual.set(1);
    this.vistaActiva.set('operaciones');
    this.cargarAuditoria();
  }

  filtrarPorAccion(modulo: string, accion: string): void {
    this.filtroModulo.set(modulo);
    this.filtroAccion.set(accion);
    this.paginaActual.set(1);
    this.vistaActiva.set('operaciones');
    this.cargarAuditoria();
  }

  verOperacionesDeSesion(sesionId: number): void {
    this.filtroSesionId.set(sesionId);
    this.filtroModulo.set('TODOS');
    this.filtroAccion.set('TODAS');
    this.paginaActual.set(1);
    this.vistaActiva.set('operaciones');
    this.cargarAuditoria();
  }

  limpiarFiltroSesion(): void {
    this.filtroSesionId.set(null);
    this.paginaActual.set(1);
    this.cargarAuditoria();
  }

  limpiarFiltros(): void {
    this.filtroModulo.set('TODOS');
    this.filtroAccion.set('TODAS');
    this.filtroSesionId.set(null);
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
    this.searchTerm.set('');
    this.paginaActual.set(1);
    this.cargarAuditoria();
  }

  aplicarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarAuditoria();
  }

  cambiarPagina(page: number): void {
    const total = this.paginacion().total_paginas;
    if (page < 1 || page > total) return;
    this.paginaActual.set(page);
    this.cargarAuditoria();
  }

  toggleExpandLog(id: number): void {
    this.expandedLogId.set(this.expandedLogId() === id ? null : id);
  }

  toggleExpandSesion(id: number): void {
    this.expandedSesionId.set(this.expandedSesionId() === id ? null : id);
  }

  formatearSegundos(segundos: number): string {
    if (!segundos || segundos <= 0) return '0s';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    const partes: string[] = [];
    if (h > 0) partes.push(`${h}h`);
    if (m > 0 || h > 0) partes.push(`${m}m`);
    partes.push(`${s}s`);
    return partes.join(' ');
  }

  obtenerEtiquetaAccion(accion: string): string {
    const mapa: Record<string, string> = {
      'LOGIN': 'Inicio de Sesión',
      'LOGOUT': 'Cierre de Sesión',
      'ELIMINAR_USUARIO': 'Usuario Eliminado',
      'ACTUALIZAR_ESTADO_PEDIDO': 'Estado de Pedido Actualizado',
      'ELIMINAR_PEDIDO': 'Pedido Eliminado',
      'RESPONDER_PQR': 'Respuesta a PQR',
      'CAMBIAR_ESTADO_PQR': 'Cambio de Estado PQR',
      'ELIMINAR_PQR': 'PQR Eliminada',
      'CREAR_COMPONENTE': 'Componente Creado',
      'ACTUALIZAR_COMPONENTE': 'Componente Actualizado',
      'ELIMINAR_COMPONENTE': 'Componente Eliminado',
      'REORDENAR_COMPONENTES': 'Componentes Reordenados',
      'ACTUALIZAR_CONFIGURACION': 'Configuración Modificada'
    };
    return mapa[accion] || accion.replace(/_/g, ' ');
  }

  esAccionCritica(accion: string): boolean {
    return accion.startsWith('ELIMINAR_');
  }

  obtenerClaseModulo(modulo: string): string {
    switch (modulo) {
      case 'USUARIOS': return 'mod-usuarios';
      case 'PEDIDOS': return 'mod-pedidos';
      case 'PQRS': return 'mod-pqrs';
      case 'AUTH': return 'mod-auth';
      case 'COMPONENTES':
      case 'CONFIGURACION': return 'mod-config';
      default: return 'mod-default';
    }
  }

  tieneDatosSnapshot(log: AuditoriaLogItem): boolean {
    const ant = log.datos_anteriores && Object.keys(log.datos_anteriores).length > 0;
    const nue = log.datos_nuevos && Object.keys(log.datos_nuevos).length > 0;
    return !!(ant || nue);
  }

  obtenerEntradasObjeto(obj: Record<string, any> | null): { clave: string; valor: string }[] {
    if (!obj) return [];
    return Object.entries(obj).map(([k, v]) => ({
      clave: k.replace(/_/g, ' '),
      valor: typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—')
    }));
  }
}

