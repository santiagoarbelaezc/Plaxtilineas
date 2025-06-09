import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-square-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './square-map.component.html',
  styleUrls: ['./square-map.component.css'] // ✅ corregido: styleUrls en plural
})
export class SquareMap {}
