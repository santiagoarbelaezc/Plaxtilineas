import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

export interface CatalogStats {
  kpis: {
    total_productos: number;
    productos_sin_variantes: number;
    pqrs_pendientes: number;
    total_categorias: number;
  };
  distribucion_categorias: any[];
  inventario: any[];
  pqrs_recientes: any[];
  alertas: any[];
}

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {

  constructor(private http: HttpClient) { }

  getCatalogStats(): Observable<CatalogStats> {
    return this.http.get<CatalogStats>(`${environment.apiUrl}/estadisticas/catalogo`);
  }
}
