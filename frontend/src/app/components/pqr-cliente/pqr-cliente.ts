import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PqrService } from '../../services/pqr.service';
import { PqrUtilService } from '../../services/pqr-util.service';

@Component({
  selector: 'app-pqr-cliente',
  imports: [CommonModule, FormsModule],
  templateUrl: './pqr-cliente.html',
  styleUrls: ['./pqr-cliente.css']
})
export class PqrClienteComponent implements OnInit {
  // Variables para crear PQR
  modo: 'crear' | 'consultar' = 'crear';
  pqrData = {
    tipo: 'PETICION',
    nombre_completo: '',
    email: '',
    telefono: '',
    producto_relacionado: '',
    descripcion: ''
  };
  
  // Variables para consultar PQR
  numeroTicketConsulta = '';
  pqrConsultada: any = null;
  
  // Archivos
  archivos: File[] = [];
  archivosPrevisualizacion: string[] = [];
  
  // Estados
  cargando = false;
  mensaje = '';
  mensajeTipo: 'success' | 'error' | 'info' = 'info';
  
  // Tipos de PQR
  tiposPQR = [
    { valor: 'PETICION', texto: 'Petición' },
    { valor: 'QUEJA', texto: 'Queja' },
    { valor: 'RECLAMO', texto: 'Reclamo' },
    { valor: 'SUGERENCIA', texto: 'Sugerencia' }
  ];
  
  // Productos relacionados (puedes obtener esto de tu base de datos)
  productosRelacionados = [
    'Espumas',
    'Thermolon',
    'Pisos',
    'Mimbres',
    'Mallas',
    'Lonas',
    'Otro producto'
  ];

  constructor(
    private pqrService: PqrService,
    private pqrUtil: PqrUtilService
  ) {}

  ngOnInit() {
    // Inicializar si es necesario
  }

  // ==================== MÉTODOS PARA CREAR PQR ====================

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    const archivosRestantes = 5 - this.archivos.length;
    
    if (files.length > archivosRestantes) {
      this.mostrarMensaje(`Solo puedes subir máximo 5 archivos. Ya tienes ${this.archivos.length} archivos.`, 'error');
      return;
    }
    
    for (let i = 0; i < files.length && this.archivos.length < 5; i++) {
      const file = files[i];
      const validacion = this.pqrUtil.validarArchivo(file);
      
      if (validacion.valido) {
        this.archivos.push(file);
        
        // Crear previsualización para imágenes
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.archivosPrevisualizacion.push(e.target.result);
          };
          reader.readAsDataURL(file);
        } else {
          this.archivosPrevisualizacion.push('');
        }
      } else {
        this.mostrarMensaje(validacion.mensaje || 'Error con archivo', 'error');
      }
    }
    
    // Resetear input de archivo
    event.target.value = '';
  }

  eliminarArchivo(index: number) {
    this.archivos.splice(index, 1);
    this.archivosPrevisualizacion.splice(index, 1);
  }

  crearPQR() {
    // Validar campos obligatorios
    if (!this.pqrData.nombre_completo.trim()) {
      this.mostrarMensaje('El nombre completo es obligatorio', 'error');
      return;
    }
    
    if (!this.pqrData.email.trim()) {
      this.mostrarMensaje('El email es obligatorio', 'error');
      return;
    }
    
    if (!this.pqrData.telefono.trim()) {
      this.mostrarMensaje('El teléfono es obligatorio', 'error');
      return;
    }
    
    if (!this.pqrData.descripcion.trim()) {
      this.mostrarMensaje('La descripción es obligatoria', 'error');
      return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.pqrData.email)) {
      this.mostrarMensaje('Por favor ingresa un email válido', 'error');
      return;
    }
    
    this.cargando = true;
    
    // Crear FormData
    const formData = new FormData();
    formData.append('tipo', this.pqrData.tipo);
    formData.append('nombre_completo', this.pqrData.nombre_completo.trim());
    formData.append('email', this.pqrData.email.trim());
    formData.append('telefono', this.pqrData.telefono.trim());
    formData.append('descripcion', this.pqrData.descripcion.trim());
    
    if (this.pqrData.producto_relacionado) {
      formData.append('producto_relacionado', this.pqrData.producto_relacionado);
    }
    
    // Agregar archivos
    for (let i = 0; i < this.archivos.length; i++) {
      formData.append('archivos', this.archivos[i]);
    }
    
    this.pqrService.crearPQR(formData).subscribe({
      next: (response) => {
        this.cargando = false;
        const mensaje = this.pqrUtil.generarMensajeExito(response.numero_ticket);
        this.mostrarMensaje(mensaje, 'success');
        
        // Cambiar a modo consulta automáticamente
        this.numeroTicketConsulta = response.numero_ticket;
        this.modo = 'consultar';
        this.consultarPQR();
        
        // Limpiar formulario de creación
        this.resetFormularioCreacion();
      },
      error: (error) => {
        this.cargando = false;
        const mensajeError = error.error?.error || 'Error al crear la PQR. Por favor intenta nuevamente.';
        this.mostrarMensaje(mensajeError, 'error');
        console.error('❌ Error creando PQR:', error);
      }
    });
  }

  resetFormularioCreacion() {
    this.pqrData = {
      tipo: 'PETICION',
      nombre_completo: '',
      email: '',
      telefono: '',
      producto_relacionado: '',
      descripcion: ''
    };
    this.archivos = [];
    this.archivosPrevisualizacion = [];
  }

  // ==================== MÉTODOS PARA CONSULTAR PQR ====================

  consultarPQR() {
    if (!this.numeroTicketConsulta.trim()) {
      this.mostrarMensaje('Por favor ingresa un número de ticket', 'error');
      return;
    }
    
    this.cargando = true;
    this.pqrConsultada = null;
    
    this.pqrService.consultarPQR(this.numeroTicketConsulta.trim()).subscribe({
      next: (response) => {
        this.cargando = false;
        this.pqrConsultada = response;
        this.mostrarMensaje('✅ PQR encontrada', 'success');
      },
      error: (error) => {
        this.cargando = false;
        this.pqrConsultada = null;
        const mensajeError = error.error?.error || 'No se encontró ninguna PQR con ese número de ticket';
        this.mostrarMensaje(mensajeError, 'error');
      }
    });
  }

  // ==================== MÉTODOS UTILITARIOS ====================

  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') {
    this.mensaje = mensaje;
    this.mensajeTipo = tipo;
    
    // Auto-ocultar mensaje después de 5 segundos
    if (tipo === 'success' || tipo === 'error') {
      setTimeout(() => {
        this.mensaje = '';
      }, 5000);
    }
  }

  cambiarModo(modo: 'crear' | 'consultar') {
    this.modo = modo;
    this.mensaje = '';
    
    if (modo === 'crear') {
      this.pqrConsultada = null;
      this.numeroTicketConsulta = '';
    }
  }

  obtenerIconoTipo(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'PETICION': '📋',
      'QUEJA': '⚠️',
      'RECLAMO': '🚨',
      'SUGERENCIA': '💡'
    };
    return iconos[tipo] || '📄';
  }

  obtenerIconoEstado(estado: string): string {
    const iconos: { [key: string]: string } = {
      'PENDIENTE': '⏳',
      'EN_PROCESO': '🔄',
      'RESUELTO': '✅',
      'CERRADO': '🔒'
    };
    return iconos[estado] || '📄';
  }

  descargarArchivo(url: string, nombre: string) {
    // Método simple para descargar archivos
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==================== GETTERS PARA TEMPLATE ====================

  get traducirTipo() {
    return (tipo: string) => this.pqrUtil.traducirTipo(tipo);
  }

  get traducirEstado() {
    return (estado: string) => this.pqrUtil.traducirEstado(estado);
  }

  get obtenerClaseEstado() {
    return (estado: string) => this.pqrUtil.obtenerClaseEstado(estado);
  }

  get obtenerClaseTipo() {
    return (tipo: string) => this.pqrUtil.obtenerClaseTipo(tipo);
  }

  get formatearFecha() {
    return (fecha: string) => this.pqrUtil.formatearFecha(fecha);
  }
}