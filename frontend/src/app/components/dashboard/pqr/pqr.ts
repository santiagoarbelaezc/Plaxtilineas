import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';

// Importar todos los iconos necesarios
import {
  faTasks,
  faFilter,
  faChartBar,
  faSyncAlt,
  faCheckCircle,
  faExclamationCircle,
  faInfoCircle,
  faTimes,
  faSlidersH,
  faFlag,
  faTag,
  faCalendarAlt,
  faSortAmountDown,
  faSort,
  faCheck,
  faBroom,
  faSearch,
  faEye,
  faReply,
  faTrashAlt,
  faInbox,
  faChevronLeft,
  faChevronRight,
  faArrowLeft,
  faUserCircle,
  faUser,
  faEnvelope,
  faPhone,
  faCalendarCheck,
  faBox,
  faCogs,
  faComment,
  faSave,
  faFileAlt,
  faPaperclip,
  faFileImage,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFile,
  faDownload,
  faComments,
  faUserShield,
  faCommentSlash,
  faPaperPlane,
  faChartPie,
  faStopwatch,
  faChartLine,
  faExclamationTriangle,
  faLightbulb,
  faClock,
  faTimesCircle,
  faExclamationTriangle as faExclamationTriangleType
} from '@fortawesome/free-solid-svg-icons';

import { PqrService } from '../../../services/pqr.service';
import { PqrUtilService } from '../../../services/pqr-util.service';
import { PQR, PQRDetalle, PQREstadisticas, PQRListado } from '../../../models/pqr.model';

@Component({
  selector: 'app-pqr-admin',
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './pqr.html',
  styleUrls: ['./pqr.css']
})
export class PqrAdminComponent implements OnInit, OnDestroy {
  // Variables principales
  pqrs: PQR[] = [];
  pqrSeleccionada: PQRDetalle | null = null;
  estadisticas: PQREstadisticas | null = null;
  
  // Filtros y búsqueda
  filtros = {
    estado: '',
    tipo: '',
    fechaInicio: '',
    fechaFin: '',
    producto: '',
    ordenarPor: 'fecha_creacion',
    orden: 'desc' as 'asc' | 'desc',
    terminoBusqueda: '',
    campoBusqueda: 'todo' as 'todo' | 'nombre' | 'email' | 'ticket'
  };
  
  // Paginación
  paginacion = {
    paginaActual: 1,
    totalPaginas: 1,
    porPagina: 10,
    total: 0
  };
  
  // Respuesta admin
  nuevaRespuesta = {
    mensaje: '',
    tipo: 'ADMINISTRACION' as 'ADMINISTRACION'
  };
  
  // Actualizar estado
  nuevoEstado = {
    estado: 'PENDIENTE' as 'PENDIENTE' | 'EN_PROCESO' | 'RESUELTO' | 'CERRADO',
    mensaje_respuesta: ''
  };
  
  // Estados UI
  cargando = false;
  cargandoEstadisticas = false;
  mensaje = '';
  mensajeTipo: 'success' | 'error' | 'info' = 'info';
  modoVista: 'lista' | 'detalle' | 'estadisticas' = 'lista';
  showFiltros = false;
  showModalConfirmacion = false;
  accionConfirmar: string = '';
  datosConfirmar: any = null;
  
  // Options para selects
  estados = [
    { valor: '', texto: 'Todos los estados' },
    { valor: 'PENDIENTE', texto: 'Pendiente' },
    { valor: 'EN_PROCESO', texto: 'En proceso' },
    { valor: 'RESUELTO', texto: 'Resuelto' },
    { valor: 'CERRADO', texto: 'Cerrado' }
  ];
  
  tipos = [
    { valor: '', texto: 'Todos los tipos' },
    { valor: 'PETICION', texto: 'Petición' },
    { valor: 'QUEJA', texto: 'Queja' },
    { valor: 'RECLAMO', texto: 'Reclamo' },
    { valor: 'SUGERENCIA', texto: 'Sugerencia' }
  ];
  
  camposBusqueda = [
    { valor: 'todo', texto: 'Todo' },
    { valor: 'nombre', texto: 'Nombre' },
    { valor: 'email', texto: 'Email' },
    { valor: 'ticket', texto: 'Número de Ticket' }
  ];
  
  ordenarOpciones = [
    { valor: 'fecha_creacion', texto: 'Fecha creación' },
    { valor: 'estado', texto: 'Estado' },
    { valor: 'tipo', texto: 'Tipo' },
    { valor: 'nombre_completo', texto: 'Nombre' }
  ];
  
  private destroy$ = new Subject<void>();
  private busquedaSubject = new Subject<string>();
  private token: string | null = null;
  
  constructor(
    private pqrService: PqrService,
    private pqrUtil: PqrUtilService,
    private library: FaIconLibrary
  ) {
    console.log('PqrAdminComponent: Constructor inicializado');
    
    // Agregar todos los iconos a la librería
    library.addIcons(
      faTasks,
      faFilter,
      faChartBar,
      faSyncAlt,
      faCheckCircle,
      faExclamationCircle,
      faInfoCircle,
      faTimes,
      faSlidersH,
      faFlag,
      faTag,
      faCalendarAlt,
      faSortAmountDown,
      faSort,
      faCheck,
      faBroom,
      faSearch,
      faEye,
      faReply,
      faTrashAlt,
      faInbox,
      faChevronLeft,
      faChevronRight,
      faArrowLeft,
      faUserCircle,
      faUser,
      faEnvelope,
      faPhone,
      faCalendarCheck,
      faBox,
      faCogs,
      faComment,
      faSave,
      faFileAlt,
      faPaperclip,
      faFileImage,
      faFilePdf,
      faFileWord,
      faFileExcel,
      faFile,
      faDownload,
      faComments,
      faUserShield,
      faCommentSlash,
      faPaperPlane,
      faChartPie,
      faStopwatch,
      faChartLine,
      faExclamationTriangle,
      faLightbulb,
      faClock,
      faTimesCircle,
      faExclamationTriangleType
    );
  }
  
  ngOnInit() {
    console.log('PqrAdminComponent: ngOnInit iniciado');
    
    // Obtener token del localStorage
    this.token = localStorage.getItem('token');
    console.log('Token obtenido:', this.token ? 'Token presente' : 'Token ausente');
    
    if (!this.token) {
      console.error('ERROR: No hay token de autenticación');
      this.mostrarMensaje('No estás autenticado', 'error');
      return;
    }
    
    console.log('Iniciando carga de datos...');
    this.cargarPQRS();
    this.cargarEstadisticas();
    
    // Configurar debounce para búsqueda
    this.busquedaSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(termino => {
      console.log('Búsqueda iniciada con término:', termino);
      this.realizarBusqueda();
    });
  }
  
  ngOnDestroy() {
    console.log('PqrAdminComponent: ngOnDestroy');
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ==================== CARGA DE DATOS ====================
  
  cargarPQRS() {
    console.log('cargarPQRS: Iniciando carga de PQRS');
    
    if (!this.token) {
      console.error('ERROR en cargarPQRS: Token no disponible');
      this.mostrarMensaje('No estás autenticado', 'error');
      return;
    }
    
    this.cargando = true;
    this.modoVista = 'lista';
    
    const params = {
      page: this.paginacion.paginaActual,
      limit: this.paginacion.porPagina,
      estado: this.filtros.estado,
      tipo: this.filtros.tipo,
      producto: this.filtros.producto,
      fecha_inicio: this.filtros.fechaInicio,
      fecha_fin: this.filtros.fechaFin,
      ordenar: this.filtros.ordenarPor,
      orden: this.filtros.orden
    };
    
    console.log('Parámetros de búsqueda:', params);
    console.log('Token usado:', this.token.substring(0, 20) + '...');
    
    this.pqrService.getPQRS(this.token, params).subscribe({
      next: (response: PQRListado) => {
        console.log('✅ SUCCESS: Datos de PQRS cargados correctamente');
        console.log('Respuesta completa:', response);
        console.log('Datos recibidos:', response.data);
        console.log('Número de PQRS:', response.data?.length || 0);
        console.log('Paginación:', response.paginacion);
        
        this.cargando = false;
        this.pqrs = response.data || [];
        
        if (response.paginacion) {
          this.paginacion = {
            paginaActual: response.paginacion.pagina_actual || 1,
            totalPaginas: response.paginacion.total_paginas || 1,
            porPagina: response.paginacion.por_pagina || 10,
            total: response.paginacion.total || 0
          };
        }
        
        console.log('PQRS asignadas:', this.pqrs.length);
        console.log('Estado de paginación:', this.paginacion);
      },
      error: (error) => {
        console.error('❌ ERROR en cargarPQRS:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error response:', error.error);
        
        this.cargando = false;
        
        if (error.status === 401) {
          this.mostrarMensaje('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
        } else if (error.status === 403) {
          this.mostrarMensaje('No tienes permisos para acceder a esta sección.', 'error');
        } else if (error.status === 404) {
          this.mostrarMensaje('El servicio de PQRS no está disponible temporalmente.', 'error');
        } else {
          this.mostrarMensaje('Error al cargar las PQRS. Intenta nuevamente.', 'error');
        }
      }
    });
  }
  
  cargarEstadisticas() {
    if (!this.token) {
      console.error('ERROR en cargarEstadisticas: Token no disponible');
      return;
    }
    
    console.log('cargarEstadisticas: Iniciando carga de estadísticas');
    
    this.cargandoEstadisticas = true;
    this.pqrService.getEstadisticas(this.token).subscribe({
      next: (response: PQREstadisticas) => {
        console.log('✅ SUCCESS: Estadísticas cargadas correctamente');
        console.log('Estadísticas recibidas:', response);
        
        this.cargandoEstadisticas = false;
        this.estadisticas = response;
      },
      error: (error) => {
        console.error('❌ ERROR en cargarEstadisticas:', error);
        this.cargandoEstadisticas = false;
      }
    });
  }
  
  // ==================== BÚSQUEDA ====================
  
  onBuscarChange() {
    console.log('onBuscarChange: Término de búsqueda:', this.filtros.terminoBusqueda);
    
    if (this.filtros.terminoBusqueda.trim()) {
      console.log('Iniciando búsqueda con debounce...');
      this.busquedaSubject.next(this.filtros.terminoBusqueda);
    } else {
      console.log('Búsqueda vacía, recargando PQRS...');
      this.cargarPQRS();
    }
  }
  
  realizarBusqueda() {
    console.log('realizarBusqueda: Ejecutando búsqueda');
    
    if (!this.token || !this.filtros.terminoBusqueda.trim()) {
      console.log('Búsqueda no válida, cargando PQRS normales');
      this.cargarPQRS();
      return;
    }
    
    this.cargando = true;
    console.log('Buscando con término:', this.filtros.terminoBusqueda);
    console.log('Campo de búsqueda:', this.filtros.campoBusqueda);
    
    this.pqrService.buscarPQRS(
      this.token,
      this.filtros.terminoBusqueda.trim(),
      this.filtros.campoBusqueda
    ).subscribe({
      next: (response) => {
        console.log('✅ SUCCESS: Búsqueda completada');
        console.log('Resultados de búsqueda:', response);
        
        this.cargando = false;
        this.pqrs = response.resultados || [];
        this.paginacion.total = response.total || 0;
        this.paginacion.totalPaginas = Math.ceil(this.paginacion.total / this.paginacion.porPagina) || 1;
        this.paginacion.paginaActual = 1;
        
        console.log('Resultados encontrados:', this.pqrs.length);
      },
      error: (error) => {
        console.error('❌ ERROR en realizarBusqueda:', error);
        this.cargando = false;
        this.mostrarMensaje('Error en la búsqueda', 'error');
      }
    });
  }
  
  // ==================== DETALLE DE PQR ====================
  
  verDetallePQR(pqr: PQR) {
    console.log('verDetallePQR: Solicitando detalles para PQR ID:', pqr.id);
    console.log('Ticket:', pqr.numero_ticket);
    
    this.cargando = true;
    
    // Intentar primero con el endpoint público
    this.pqrService.consultarPQR(pqr.id).subscribe({
      next: (response: any) => {
        console.log('✅ SUCCESS: Detalles de PQR cargados (público)');
        console.log('Detalles recibidos:', response);
        
        this.cargando = false;
        this.pqrSeleccionada = response.pqr || response;
        this.modoVista = 'detalle';
        this.nuevoEstado.estado = response.estado;
        this.nuevoEstado.mensaje_respuesta = '';
        this.nuevaRespuesta.mensaje = '';
        
        console.log('PQR seleccionada:', this.pqrSeleccionada);
        
        // Scroll al inicio del detalle
        setTimeout(() => {
          const detalleElement = document.querySelector('.detalle-container');
          if (detalleElement) {
            detalleElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      },
      error: (error) => {
        console.warn('Advertencia: Falló endpoint público, intentando con admin...');
        console.error('Error endpoint público:', error);
        
        // Si falla el público, intentar con el token admin
        if (this.token) {
          this.cargarDetalleConToken(pqr.id);
        } else {
          this.cargando = false;
          this.mostrarMensaje('Error al cargar los detalles', 'error');
        }
      }
    });
  }
  
  private cargarDetalleConToken(pqrId: string) {
    console.log('cargarDetalleConToken: Intentando con token admin');
    
    if (!this.token) {
      this.cargando = false;
      this.mostrarMensaje('No estás autenticado', 'error');
      return;
    }
    
    // Crear un método temporal si no existe en el servicio
    this.httpGetDetalle(pqrId).subscribe({
      next: (response: any) => {
        console.log('✅ SUCCESS: Detalles de PQR cargados (admin)');
        console.log('Detalles recibidos:', response);
        
        this.cargando = false;
        this.pqrSeleccionada = response.pqr || response;
        this.modoVista = 'detalle';
        this.nuevoEstado.estado = response.estado;
        this.nuevoEstado.mensaje_respuesta = '';
        this.nuevaRespuesta.mensaje = '';
      },
      error: (error) => {
        console.error('❌ ERROR en cargarDetalleConToken:', error);
        this.cargando = false;
        this.mostrarMensaje('Error al cargar los detalles', 'error');
      }
    });
  }
  
  private httpGetDetalle(pqrId: string) {
    // Método temporal para obtener detalles con token
    // En producción, deberías agregar esto al servicio
    return this.pqrService['http'].get(`${this.pqrService['apiUrl']}/admin/${pqrId}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
  }
  
  volverALista() {
    console.log('Volviendo a la lista');
    this.modoVista = 'lista';
    this.pqrSeleccionada = null;
  }
  
  // ==================== RESPUESTAS Y ESTADOS ====================
  
  agregarRespuesta() {
    console.log('agregarRespuesta: Intentando agregar respuesta');
    
    if (!this.pqrSeleccionada) {
      console.error('ERROR: No hay PQR seleccionada');
      this.mostrarMensaje('No hay PQR seleccionada', 'error');
      return;
    }
    
    if (!this.nuevaRespuesta.mensaje.trim()) {
      console.error('ERROR: Mensaje vacío');
      this.mostrarMensaje('Debes escribir un mensaje', 'error');
      return;
    }
    
    if (!this.token) {
      console.error('ERROR: Token no disponible');
      return;
    }
    
    console.log('Agregando respuesta a PQR:', this.pqrSeleccionada.id);
    console.log('Mensaje:', this.nuevaRespuesta.mensaje);
    
    this.cargando = true;
    this.pqrService.agregarRespuesta(
      this.token,
      this.pqrSeleccionada.id,
      this.nuevaRespuesta
    ).subscribe({
      next: () => {
        console.log('✅ SUCCESS: Respuesta agregada correctamente');
        this.cargando = false;
        this.mostrarMensaje('Respuesta agregada correctamente', 'success');
        this.nuevaRespuesta.mensaje = '';
        
        // Recargar detalles
        console.log('Recargando detalles después de agregar respuesta...');
        this.verDetallePQR(this.pqrSeleccionada!);
      },
      error: (error) => {
        console.error('❌ ERROR en agregarRespuesta:', error);
        this.cargando = false;
        this.mostrarMensaje('Error al agregar respuesta', 'error');
      }
    });
  }
  
  actualizarEstado() {
    console.log('actualizarEstado: Intentando actualizar estado');
    
    if (!this.pqrSeleccionada) {
      console.error('ERROR: No hay PQR seleccionada');
      return;
    }
    
    console.log('Estado actual:', this.pqrSeleccionada.estado);
    console.log('Nuevo estado:', this.nuevoEstado.estado);
    
    if (this.nuevoEstado.estado === this.pqrSeleccionada.estado) {
      console.log('INFO: El estado ya está establecido');
      this.mostrarMensaje('El estado ya está establecido', 'info');
      return;
    }
    
    this.confirmarAccion(
      'actualizar-estado',
      '¿Estás seguro de actualizar el estado?',
      { pqrId: this.pqrSeleccionada.id, estadoData: { ...this.nuevoEstado } }
    );
  }
  
  ejecutarActualizarEstado(pqrId: string, estadoData: any) {
    console.log('ejecutarActualizarEstado: Ejecutando actualización');
    
    if (!this.token) {
      console.error('ERROR: Token no disponible');
      return;
    }
    
    console.log('Actualizando estado para PQR:', pqrId);
    console.log('Datos de estado:', estadoData);
    
    this.cargando = true;
    this.pqrService.actualizarEstadoPQR(this.token, pqrId, estadoData).subscribe({
      next: () => {
        console.log('✅ SUCCESS: Estado actualizado correctamente');
        this.cargando = false;
        this.mostrarMensaje('Estado actualizado correctamente', 'success');
        this.nuevoEstado.mensaje_respuesta = '';
        
        // Recargar detalles y lista
        console.log('Recargando datos después de actualizar estado...');
        if (this.pqrSeleccionada) {
          this.verDetallePQR(this.pqrSeleccionada);
        }
        this.cargarPQRS();
        this.cargarEstadisticas();
      },
      error: (error) => {
        console.error('❌ ERROR en ejecutarActualizarEstado:', error);
        this.cargando = false;
        this.mostrarMensaje('Error al actualizar estado', 'error');
      }
    });
  }
  
  // ==================== ELIMINAR PQR ====================
  
  eliminarPQR(pqr: PQR) {
    console.log('eliminarPQR: Solicitando confirmación para eliminar');
    console.log('PQR a eliminar:', pqr.numero_ticket, pqr.id);
    
    this.confirmarAccion(
      'eliminar',
      `¿Estás seguro de eliminar la PQR ${pqr.numero_ticket}? Esta acción no se puede deshacer.`,
      { pqrId: pqr.id }
    );
  }
  
  ejecutarEliminarPQR(pqrId: string) {
    console.log('ejecutarEliminarPQR: Ejecutando eliminación');
    
    if (!this.token) {
      console.error('ERROR: Token no disponible');
      return;
    }
    
    console.log('Eliminando PQR:', pqrId);
    
    this.cargando = true;
    this.pqrService.eliminarPQR(this.token, pqrId).subscribe({
      next: () => {
        console.log('✅ SUCCESS: PQR eliminada correctamente');
        this.cargando = false;
        this.mostrarMensaje('PQR eliminada correctamente', 'success');
        
        // Recargar lista y estadísticas
        console.log('Recargando datos después de eliminar...');
        this.cargarPQRS();
        this.cargarEstadisticas();
        
        // Si estábamos viendo el detalle de la PQR eliminada, volver a lista
        if (this.pqrSeleccionada && this.pqrSeleccionada.id === pqrId) {
          console.log('PQR eliminada estaba en detalle, volviendo a lista...');
          this.volverALista();
        }
      },
      error: (error) => {
        console.error('❌ ERROR en ejecutarEliminarPQR:', error);
        this.cargando = false;
        this.mostrarMensaje('Error al eliminar PQR', 'error');
      }
    });
  }
  
  // ==================== CONFIRMACIÓN DE ACCIONES ====================
  
  confirmarAccion(accion: string, mensaje: string, datos: any) {
    console.log('confirmarAccion:', accion);
    console.log('Mensaje:', mensaje);
    console.log('Datos:', datos);
    
    this.accionConfirmar = accion;
    this.datosConfirmar = datos;
    this.mostrarMensaje(mensaje, 'info');
    this.showModalConfirmacion = true;
  }
  
  confirmarAccionModal() {
    console.log('confirmarAccionModal: Confirmando acción', this.accionConfirmar);
    
    this.showModalConfirmacion = false;
    
    switch (this.accionConfirmar) {
      case 'eliminar':
        this.ejecutarEliminarPQR(this.datosConfirmar.pqrId);
        break;
      case 'actualizar-estado':
        this.ejecutarActualizarEstado(
          this.datosConfirmar.pqrId,
          this.datosConfirmar.estadoData
        );
        break;
    }
    
    this.accionConfirmar = '';
    this.datosConfirmar = null;
  }
  
  cancelarAccionModal() {
    console.log('cancelarAccionModal: Cancelando acción');
    
    this.showModalConfirmacion = false;
    this.accionConfirmar = '';
    this.datosConfirmar = null;
    this.mensaje = '';
  }
  
  // ==================== PAGINACIÓN ====================
  
  cambiarPagina(pagina: number) {
    console.log('cambiarPagina: Cambiando a página', pagina);
    
    if (pagina < 1 || pagina > this.paginacion.totalPaginas) {
      console.warn('Página inválida:', pagina);
      return;
    }
    
    this.paginacion.paginaActual = pagina;
    this.cargarPQRS();
  }
  
  cambiarItemsPorPagina() {
    console.log('cambiarItemsPorPagina: Cambiando a', this.paginacion.porPagina, 'ítems por página');
    
    this.paginacion.paginaActual = 1;
    this.cargarPQRS();
  }
  
  // ==================== FILTROS ====================
  
  aplicarFiltros() {
    console.log('aplicarFiltros: Aplicando filtros');
    console.log('Filtros actuales:', this.filtros);
    
    this.paginacion.paginaActual = 1;
    this.cargarPQRS();
    this.showFiltros = false;
  }
  
  limpiarFiltros() {
    console.log('limpiarFiltros: Limpiando todos los filtros');
    
    this.filtros = {
      estado: '',
      tipo: '',
      fechaInicio: '',
      fechaFin: '',
      producto: '',
      ordenarPor: 'fecha_creacion',
      orden: 'desc',
      terminoBusqueda: '',
      campoBusqueda: 'todo'
    };
    this.paginacion.paginaActual = 1;
    this.cargarPQRS();
    this.showFiltros = false;
  }
  
  // ==================== UTILITARIOS ====================
  
  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') {
    console.log(`mostrarMensaje [${tipo}]:`, mensaje);
    
    this.mensaje = mensaje;
    this.mensajeTipo = tipo;
    
    if (tipo === 'success' || tipo === 'error') {
      setTimeout(() => {
        if (this.mensaje === mensaje) {
          this.mensaje = '';
        }
      }, 5000);
    }
  }
  
  descargarArchivo(url: string, nombre: string) {
    console.log('descargarArchivo: Descargando', nombre, 'desde', url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  obtenerClasePrioridad(pqr: PQR): string {
    const clase = pqr.estado === 'PENDIENTE' ? 'prioridad-alta' :
                  pqr.estado === 'EN_PROCESO' ? 'prioridad-media' :
                  'prioridad-baja';
    return clase;
  }
  
  // ==================== MÉTODOS PARA TEMPLATE ====================
  
  traducirTipo(tipo: string): string {
    return this.pqrUtil.traducirTipo(tipo);
  }
  
  traducirEstado(estado: string): string {
    return this.pqrUtil.traducirEstado(estado);
  }
  
  obtenerClaseEstado(estado: string): string {
    return this.pqrUtil.obtenerClaseEstado(estado);
  }
  
  obtenerClaseTipo(tipo: string): string {
    return this.pqrUtil.obtenerClaseTipo(tipo);
  }
  
  formatearFecha(fecha: string): string {
    return this.pqrUtil.formatearFecha(fecha);
  }
  
  get arrayNumerosPaginas(): number[] {
    const paginas: number[] = [];
    const totalPaginas = this.paginacion.totalPaginas;
    const paginaActual = this.paginacion.paginaActual;
    
    let inicio = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPaginas, paginaActual + 2);
    
    if (fin - inicio < 4) {
      if (inicio === 1) {
        fin = Math.min(totalPaginas, inicio + 4);
      } else {
        inicio = Math.max(1, fin - 4);
      }
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }
  
  // ==================== DEPURACIÓN ====================
  
  get debugInfo() {
    return {
      tokenPresente: !!this.token,
      tokenLength: this.token ? this.token.length : 0,
      pqrsCargadas: this.pqrs.length,
      cargando: this.cargando,
      modoVista: this.modoVista,
      pqrSeleccionada: !!this.pqrSeleccionada,
      filtrosActivos: Object.entries(this.filtros)
        .filter(([key, value]) => value && value !== '')
        .map(([key, value]) => `${key}: ${value}`)
    };
  }
  
  mostrarDebugInfo() {
    console.log('=== DEBUG INFO ===');
    console.log('Token presente:', !!this.token);
    console.log('Número de PQRS:', this.pqrs.length);
    console.log('Cargando:', this.cargando);
    console.log('Modo vista:', this.modoVista);
    console.log('PQR seleccionada:', this.pqrSeleccionada);
    console.log('Filtros activos:', this.debugInfo.filtrosActivos);
    console.log('Paginación:', this.paginacion);
    console.log('Estadísticas:', !!this.estadisticas);
    console.log('==================');
  }
}