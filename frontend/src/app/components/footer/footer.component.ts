import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true, // ✅ necesario
  imports: [],       // ✅ puedes dejarlo vacío si no usa nada adicional
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'] // ✅ corregido: styleUrls, no styleUrl
})
export class Footer {}
