import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private http = inject(HttpClient);
  
  private wompiEnabledSubject = new BehaviorSubject<boolean>(true);
  wompiEnabled$ = this.wompiEnabledSubject.asObservable();

  constructor() {
    this.loadConfiguraciones();
  }

  loadConfiguraciones() {
    this.http.get<any>(`${environment.apiUrl}/configuraciones`).subscribe({
      next: (config) => {
        if (config && config.wompi_enabled !== undefined) {
          this.wompiEnabledSubject.next(config.wompi_enabled === '1');
        }
      },
      error: (err) => console.error('Error al cargar configuraciones', err)
    });
  }

  updateWompiStatus(enabled: boolean): Observable<any> {
    const valor = enabled ? '1' : '0';
    return this.http.put(`${environment.apiUrl}/configuraciones/wompi_enabled`, { valor }).pipe(
      tap(() => this.wompiEnabledSubject.next(enabled))
    );
  }
}
