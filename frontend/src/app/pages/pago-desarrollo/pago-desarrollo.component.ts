import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-pago-desarrollo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pago-desarrollo.component.html',
  styleUrls: ['./pago-desarrollo.component.css']
})
export class PagoDesarrolloComponent {
  numeroPedido = '';

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras.state?.['pedido']) {
      this.numeroPedido = nav.extras.state?.['pedido'].codigo_pedido || 'TU-PEDIDO';
    }
  }

  contactarAsesor() {
    const phone = '573123456789'; // TODO: replace with actual number if provided
    const text = `Hola, quiero finalizar el pago de mi pedido ${this.numeroPedido} que generé en la tienda virtual.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  }
}
