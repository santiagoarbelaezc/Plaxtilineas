import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { WOMPI_LAST_ORDER_STORAGE_KEY } from '../../services/wompi.service';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: ``
})
export class PagoExitosoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cartService = inject(CartService);

  ngOnInit(): void {
    let ref = this.route.snapshot.queryParamMap.get('ref') ?? '';
    const txId = this.route.snapshot.queryParamMap.get('id') ?? this.route.snapshot.queryParamMap.get('tx') ?? '';

    if (!ref) {
      try {
        const raw = sessionStorage.getItem(WOMPI_LAST_ORDER_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.referencia) ref = saved.referencia;
        }
      } catch {
        // Ignorar errores de sessionStorage
      }
    }

    if (ref || txId) {
      this.cartService.clearCart();
    }

    this.router.navigate(['/perfil'], {
      queryParams: {
        tab: 'pedidos',
        ...(ref ? { ref } : {}),
        ...(txId ? { tx: txId } : {})
      },
      replaceUrl: true
    });
  }
}
