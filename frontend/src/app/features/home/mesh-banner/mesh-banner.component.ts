import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Aliado {
  nombre: string;
  logo: string;
  scale?: number;
}

@Component({
  selector: 'app-mesh-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mesh-banner.component.html',
  styleUrls: ['./mesh-banner.component.css']
})
export class MeshBannerComponent {
  aliados: Aliado[] = [
    { nombre: 'Plastextil', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/logo-plastextil_ibgjci.png', scale: 0.9 },
    { nombre: 'Espumas Santafé', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878740/espumas_santafe_k82s21.png', scale: 1.05 },
    { nombre: 'Espumas Medellín', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/espumas_medellin_dd3gcm.png', scale: 1.3 },
    { nombre: 'Testicol', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878742/Testicol_do2hm1.png', scale: 1.85 },
    { nombre: 'Polylon', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/POLYLON_ahvqpe.png', scale: 1.8 },
    { nombre: 'Grupo Excala', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878742/grupoExcala_abrci9.png', scale: 1.0 },
    { nombre: 'Pegatex Artecola', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878741/logo-pegatex_ixgyw0.png', scale: 1.1 },
    { nombre: 'Preflex', logo: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1759878742/preflex_vjabto.png', scale: 1.25 }
  ];
}
