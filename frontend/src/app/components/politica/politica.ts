import { Component } from '@angular/core';

@Component({
  selector: 'app-politica',
  imports: [],
  templateUrl: './politica.html',
  styleUrls: ['./politica.css']
})
export class Politica {
  fechaActualizacion: string = '2025';
  nombreEmpresa: string = 'PLAXTILINEAS';
  contacto = {
    telefono1: '+57 (606) 7390968',
    telefono2: '+57 3006680125',
    email: 'plaxtilineas.sas@gmail.com',
    direccion: 'Cra. 19 # 19 - 35, Armenia, Quindío'
  };
}