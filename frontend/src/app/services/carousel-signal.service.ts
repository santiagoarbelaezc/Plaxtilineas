// src/app/services/carousel-signal.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CarouselSignalService {
  // Subject para notificar cuando se selecciona un nuevo producto
  private productoSeleccionadoSubject = new Subject<number>();
  
  // Observable al que se pueden suscribir los componentes interesados
  productoSeleccionado$ = this.productoSeleccionadoSubject.asObservable();
  
  // Método para emitir la señal con el ID del producto seleccionado
  notificarProductoSeleccionado(productoId: number) {
    this.productoSeleccionadoSubject.next(productoId);
  }
  
  // Método para forzar recarga específica del carrusel
  forzarRecargaCarousel() {
    this.productoSeleccionadoSubject.next(-1); // Usar -1 como señal especial
  }
}