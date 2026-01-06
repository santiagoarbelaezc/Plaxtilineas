import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PqrUtilService {
  
  /**
   * Traducir tipo de PQR a texto legible
   */
  traducirTipo(tipo: string): string {
    const traducciones: { [key: string]: string } = {
      'PETICION': 'Petición',
      'QUEJA': 'Queja',
      'RECLAMO': 'Reclamo',
      'SUGERENCIA': 'Sugerencia'
    };
    return traducciones[tipo] || tipo;
  }

  /**
   * Traducir estado de PQR a texto legible
   */
  traducirEstado(estado: string): string {
    const traducciones: { [key: string]: string } = {
      'PENDIENTE': 'Pendiente',
      'EN_PROCESO': 'En Proceso',
      'RESUELTO': 'Resuelto',
      'CERRADO': 'Cerrado'
    };
    return traducciones[estado] || estado;
  }

  /**
   * Obtener clase CSS para el estado
   */
  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'EN_PROCESO': 'bg-blue-100 text-blue-800',
      'RESUELTO': 'bg-green-100 text-green-800',
      'CERRADO': 'bg-gray-100 text-gray-800'
    };
    return clases[estado] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Obtener clase CSS para el tipo
   */
  obtenerClaseTipo(tipo: string): string {
    const clases: { [key: string]: string } = {
      'PETICION': 'bg-purple-100 text-purple-800',
      'QUEJA': 'bg-red-100 text-red-800',
      'RECLAMO': 'bg-orange-100 text-orange-800',
      'SUGERENCIA': 'bg-teal-100 text-teal-800'
    };
    return clases[tipo] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Validar si un archivo es permitido
   */
  validarArchivo(file: File): { valido: boolean; mensaje?: string } {
    const extensionesPermitidas = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // Validar tamaño
    if (file.size > maxSize) {
      return {
        valido: false,
        mensaje: `El archivo ${file.name} excede el tamaño máximo de 10MB`
      };
    }
    
    // Validar extensión
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!extensionesPermitidas.includes(extension)) {
      return {
        valido: false,
        mensaje: `Tipo de archivo no permitido. Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX`
      };
    }
    
    return { valido: true };
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Generar mensaje de éxito para PQR creada
   */
  generarMensajeExito(numeroTicket: string): string {
    return `✅ Tu PQR ha sido creada exitosamente. Tu número de ticket es: ${numeroTicket}. Guarda este número para consultar el estado.`;
  }

  /**
   * Crear FormData para enviar PQR con archivos
   */
  crearFormDataPQR(data: any, archivos: File[] = []): FormData {
    const formData = new FormData();
    
    // Agregar campos de texto
    formData.append('tipo', data.tipo);
    formData.append('nombre_completo', data.nombre_completo);
    formData.append('email', data.email);
    formData.append('telefono', data.telefono);
    formData.append('descripcion', data.descripcion);
    
    if (data.producto_relacionado) {
      formData.append('producto_relacionado', data.producto_relacionado);
    }
    
    // Agregar archivos
    for (let i = 0; i < archivos.length; i++) {
      formData.append('archivos', archivos[i]);
    }
    
    return formData;
  }
}