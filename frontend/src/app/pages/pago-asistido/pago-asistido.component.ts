import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-pago-asistido',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pago-asistido.component.html',
  styleUrls: ['./pago-asistido.component.css']
})
export class PagoAsistidoComponent {
  numeroPedido = '';
  metodoPago: 'asesor' | 'transferencia' = 'transferencia';

  // Configuración dinámica según el método
  titulo = '';
  subtitulo = '';
  paso3Titulo = '';
  paso3Desc = '';

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras.state) {
      if (nav.extras.state['pedido']) {
        this.numeroPedido = nav.extras.state['pedido'].codigo_pedido || 'TU-PEDIDO';
      }
      if (nav.extras.state['metodo']) {
        this.metodoPago = nav.extras.state['metodo'];
      }
    }

    this.configurarTextos();
  }

  configurarTextos() {
    this.titulo = 'Mejorando tu Experiencia de Pago';
    
    if (this.metodoPago === 'asesor') {
      this.subtitulo = 'Nuestra plataforma de pagos directos se encuentra temporalmente en actualización para brindarte aún más seguridad y opciones.';
      this.paso3Titulo = 'Asistencia Personalizada';
      this.paso3Desc = 'Un asesor experto se pondrá en contacto contigo para ayudarte a finalizar tu compra.';
    } else {
      this.subtitulo = 'Nuestra integración con Transferencia Bancaria se encuentra temporalmente en actualización para brindarte aún más seguridad y opciones.';
      this.paso3Titulo = 'Pago Seguro';
      this.paso3Desc = 'Te enviaremos los datos de nuestras cuentas bancarias oficiales para que realices la transferencia.';
    }
  }

  contactarAsesor() {
    const phone = '573007365939'; // Número de Plaxtilineas (sacado del navbar)
    const labelMetodo = this.metodoPago === 'asesor' ? 'Asesor' : 'Transferencia Bancaria';
    const text = `Hola, quiero finalizar mi pedido ${this.numeroPedido} mediante pago por ${labelMetodo}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  }
}
